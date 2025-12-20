import type { ParsedCharacterData, SkillEffect, SkillData } from './wikiParser';

export interface BuffModifier {
    sourceCharacterName: string;
    skillName: string;
    skillLevel: string; // "Lv.5" etc. or just index
    description?: string;
    effectType: string;
    attribute: string;
    value: number;
    stackCount?: number;
    id: string;      // Unique identifier for toggling
    isActive: boolean; // Whether it's currently enabled
}

export interface CalculatedBuffs {
    attackIncreasePercent: number;
    critRateTotal: number;
    critDamageTotal: number;
    hyperCritDamageBuff: number;
    modifiers: BuffModifier[];
}
export const calculateMaxBuffs = (
    attacker: ParsedCharacterData,
    supporters: ParsedCharacterData[],
    stackCounts: Record<string, number> = {},
    activeExSkills: Record<string, boolean> = {},
    activeSkillLevels: Record<string, string> = {},
    disabledBuffIds: Set<string> = new Set()
): CalculatedBuffs => {
    let attackIncreasePercent = 0;
    let critRateBuff = 0;
    let critDamageBuff = 0;
    let hyperCritDamageBuff = 0;
    const modifiers: BuffModifier[] = [];

    // Helper to find the correct level (using the exported helper)
    const findLevel = (skill: SkillData, charName: string) => findSkillLevel(skill, charName, activeSkillLevels);

    // 0. Pre-calculate "Global Support/Attack Buffs" from Supporters to other Supporters
    let globalSupportBuffFromSupporters = 0;
    supporters.forEach(supporter => {
        supporter.skills.forEach(skill => {
            const targetLevel = findLevel(skill, supporter.name || '');
            if (targetLevel && targetLevel.effects) {
                // Check Ex Toggle
                if (targetLevel.level === 'Ex' && activeExSkills[supporter.name || ''] === false) return;

                targetLevel.effects.forEach((effect: SkillEffect) => {
                    // Check for buffs that target All Allies (or Default) and boost Support Power
                    // IMPORTANT: Exclude SupportScaling buffs from this pre-calc to avoid circular deps and incorrect static additions.
                    if (effect.type === 'Buff' &&
                        (effect.target === 'AllAllies' || effect.target === 'Default') &&
                        effect.attribute === 'Support' &&
                        effect.calculationType !== 'SupportScaling'
                    ) {
                        let value = effect.value;
                        // Apply Stacks
                        if (effect.isStackable) {
                            const count = stackCounts[skill.name] ?? 1;
                            if (count > 1) value = value * count;
                        }
                        globalSupportBuffFromSupporters += value;
                    }
                });
            }
        });
    });

    // Pre-calculate effective stats for supporters, including the global buff
    const effectiveSupporters = supporters.map(s => calculateEffectiveStats(s, stackCounts, activeExSkills, activeSkillLevels, globalSupportBuffFromSupporters));

    // Helper to process effects
    const processEffects = (effects: SkillEffect[], character: ParsedCharacterData, isAttacker: boolean, skillName: string, levelName: string, description: string | null, silentCount: number) => {
        effects.forEach(effect => {
            const isBuff = effect.type === 'Buff';
            const isDebuff = effect.type === 'Debuff';
            if (!isBuff && !isDebuff) return;

            // Determine if this effect applies to the attacker
            let applies = false;
            if (isAttacker) {
                // Attacker's own buffs/debuffs
                if (effect.target === 'Self' || effect.target === 'AllAllies' || effect.target === 'Default') {
                    applies = true;
                }
            } else {
                // Supporter's buffs/debuffs (Debuffs from support usually on enemies, but could be "All Allies Defense Down" etc?)
                // For now assume same targeting rules: if it targets Allies/Default (Ally), it applies.
                if (effect.target === 'AllAllies' || effect.target === 'Default') {
                    applies = true;
                }
            }

            if (applies) {
                let value = effect.value;
                let appliedStackCount: number | undefined = undefined;

                if (effect.calculationType === 'SupportScaling') {
                    const supportPower = getSupportPower(character.stats);
                    value = supportPower * (effect.value / 100);
                } else if (effect.calculationType === 'SilentScaling') {
                    value = effect.value * silentCount;
                }

                // Apply Stacks
                if (effect.isStackable) {
                    const count = stackCounts[skillName] ?? 1;
                    if (count > 1) {
                        value = value * count;
                    }
                    // User requested "1 or more". If stackable, we define stackCount.
                    appliedStackCount = count;
                }

                // Negate for Debuffs
                if (isDebuff) {
                    value = -value;
                }

                if (value !== 0) {
                    const modId = `${character.name || 'Unknown'}-${skillName}-${effect.attribute}-${effect.type}`;
                    const isDisabled = disabledBuffIds.has(modId);

                    modifiers.push({
                        id: modId,
                        isActive: !isDisabled,
                        sourceCharacterName: character.name || 'Unknown',
                        skillName: skillName,
                        skillLevel: levelName,
                        description: description || undefined,
                        effectType: effect.type,
                        attribute: effect.attribute,
                        value: value,
                        stackCount: appliedStackCount
                    });

                    // Only accumulate if active
                    if (!isDisabled) {
                        if (effect.attribute === 'Attack') {
                            // Attack buffs are usually percentage based increases
                            attackIncreasePercent += value;
                        } else if (effect.attribute === 'CritRate') {
                            critRateBuff += value;
                        } else if (effect.attribute === 'CritDamage') {
                            critDamageBuff += value;
                        } else if (effect.attribute === 'HyperCritDamage') {
                            hyperCritDamageBuff += value;
                        }
                    }
                }
            }
        });
    };

    // 1. Process Attacker's own skills
    const attackerSilentCount = countSilentBuffs(attacker, stackCounts, activeExSkills, activeSkillLevels);
    attacker.skills.forEach(skill => {
        const targetLevel = findLevel(skill, attacker.name || '');
        if (targetLevel && targetLevel.effects) {
            // Check Ex Toggle
            if (targetLevel.level === 'Ex' && activeExSkills[attacker.name || ''] === false) {
                return;
            }

            let description = targetLevel.description;
            if (!description) {
                const targetNum = parseInt(targetLevel.level, 10);
                if (!isNaN(targetNum)) {
                    const fallback = skill.levels
                        .filter(l => l.description)
                        .map(l => ({ l, num: parseInt(l.level, 10) }))
                        .filter(x => !isNaN(x.num) && x.num <= targetNum)
                        .sort((a, b) => b.num - a.num)[0]; // Sort descending

                    if (fallback) description = fallback.l.description;
                }
            }

            processEffects(targetLevel.effects, attacker, true, skill.name, targetLevel.level || 'Max', description, attackerSilentCount);
        }
    });

    // 2. Process Supporters' skills (using effective stats)
    effectiveSupporters.forEach(supporter => {
        const supporterSilentCount = countSilentBuffs(supporter, stackCounts, activeExSkills, activeSkillLevels);
        supporter.skills.forEach(skill => {
            const targetLevel = findLevel(skill, supporter.name || '');
            if (targetLevel && targetLevel.effects) {
                // Check Ex Toggle
                if (targetLevel.level === 'Ex' && activeExSkills[supporter.name || ''] === false) {
                    return;
                }

                let description = targetLevel.description;
                if (!description) {
                    const targetNum = parseInt(targetLevel.level, 10);
                    if (!isNaN(targetNum)) {
                        const fallback = skill.levels
                            .filter(l => l.description)
                            .map(l => ({ l, num: parseInt(l.level, 10) }))
                            .filter(x => !isNaN(x.num) && x.num <= targetNum)
                            .sort((a, b) => b.num - a.num)[0]; // Sort descending

                        if (fallback) description = fallback.l.description;
                    }
                }

                processEffects(targetLevel.effects, supporter, false, skill.name, targetLevel.level || 'Max', description, supporterSilentCount);
            }
        });
    });

    // Base stats
    const baseCritRate = typeof attacker.stats?.critRate === 'number' ? attacker.stats.critRate : parseFloat(attacker.stats?.critRate || '0');
    const baseCritDamage = typeof attacker.stats?.critDamage === 'number' ? attacker.stats.critDamage : parseFloat(attacker.stats?.critDamage || '0');

    return {
        attackIncreasePercent,
        critRateTotal: baseCritRate + critRateBuff,
        critDamageTotal: baseCritDamage + critDamageBuff + hyperCritDamageBuff,
        hyperCritDamageBuff,
        modifiers
    };
};

// Helper to get Support Power safely (handles 'Support' vs 'Attack' property)
const getSupportPower = (stats: any): number => {
    if (!stats) return 0;
    // explicit check for Support first
    if (stats.Support !== undefined) {
        return typeof stats.Support === 'number' ? stats.Support : parseFloat(stats.Support);
    }
    return 0;
};

export const calculateEffectiveStats = (
    character: ParsedCharacterData,
    stackCounts: Record<string, number> = {},
    activeExSkills: Record<string, boolean> = {},
    activeSkillLevels: Record<string, string> = {},
    globalSupportBuffPercent: number = 0
): ParsedCharacterData => {
    const baseSupport = getSupportPower(character.stats);

    // Accumulate percentage increase for Attack (Support Power)
    // Initialize with global buffs from other supporters
    let supportPowerIncrease = globalSupportBuffPercent;

    character.skills.forEach(skill => {
        // Find level logic duplicated for now (or could be shared, but simple enough)
        let maxLevel = undefined;
        const preferredLevel = activeSkillLevels[character.name || ''];
        if (preferredLevel) {
            maxLevel = skill.levels.find(l => l.level === preferredLevel);
        }
        if (!maxLevel) {
            maxLevel = [...skill.levels].reverse().find(l => l.effects && l.effects.length > 0) || skill.levels[skill.levels.length - 1];
        }

        if (!maxLevel || !maxLevel.effects) return;

        // Check Ex Toggle
        if (maxLevel.level === 'Ex' && activeExSkills[character.name || ''] === false) {
            return;
        }

        maxLevel.effects.forEach(effect => {
            // Must be Buff, target Self, and attribute Support
            if (effect.type === 'Buff' && effect.target === 'Self' && effect.attribute === 'Support') {
                let value = effect.value;

                // Apply Stacks (if implemented for self buffs too)
                if (effect.isStackable) {
                    const count = stackCounts[skill.name] ?? 1;
                    if (count > 1) {
                        value = value * count;
                    }
                }

                supportPowerIncrease += value;
            }
        });
    });

    // Calculate effective attack (Support Power)
    // Support Power is a percentage value, so increases are additive.
    // e.g. Base 110% + Buff 90% + Global 20% = 220%
    const effectiveSupport = baseSupport + supportPowerIncrease;

    // Detect which key to update
    const stats = character.stats || {};
    const newStats = { ...stats } as any;

    // Strict update: Always update 'Support'
    newStats.Support = effectiveSupport;

    return {
        ...character,
        stats: newStats
    };
};

// Extracted Helper for finding the correct skill level based on configuration
export const findSkillLevel = (
    skill: SkillData,
    charName: string,
    activeSkillLevels: Record<string, string>
) => {
    const preferredLevel = activeSkillLevels[charName];
    if (preferredLevel) {
        // 1. Try exact match
        const found = skill.levels.find((l: any) => l.level === preferredLevel);
        if (found) return found;

        // 2. Try numeric fallback
        const preferredNum = parseInt(preferredLevel, 10);
        if (!isNaN(preferredNum)) {
            // Find valid numeric levels
            const numericLevels = skill.levels
                .map(l => ({ l, num: parseInt(l.level, 10) }))
                .filter(x => !isNaN(x.num))
                .sort((a, b) => a.num - b.num);

            // Find highest level <= preferredNum
            // Iterate backwards
            for (let i = numericLevels.length - 1; i >= 0; i--) {
                if (numericLevels[i].num <= preferredNum) {
                    return numericLevels[i].l;
                }
            }
        }
    }
    // Fallback to max level logic or last available
    // Note: The original logic in calculateMaxBuffs used search for "effects > 0" reversed.
    return [...skill.levels].reverse().find((l: any) => l.effects && l.effects.length > 0) || skill.levels[skill.levels.length - 1];
};

export const getStackableSkills = (
    character: ParsedCharacterData,
    activeSkillLevels: Record<string, string> = {},
    activeExSkills: Record<string, boolean> = {}
): SkillData[] => {
    return character.skills.filter(skill => {
        // Find effective level
        const levelObj = findSkillLevel(skill, character.name || '', activeSkillLevels);

        // Determine if we should check 'Ex' level instead if toggle is active
        const exLevel = skill.levels.find(l => l.level === 'Ex');
        const isExAvailable = !!exLevel;
        const exEnabled = activeExSkills[character.name || ''] !== false; // Default true if undefined

        // Logic: 
        // If skill has Ex level AND Ex is enabled, does it OVERRIDE the normal level?
        // Or do we just check "What is the active effect?"
        // In current parser, "Ex" is a separate level.
        // If user selected "Lv 10", but Ex is active... 
        // Usually Ex skills are passive/extra effects that apply IN ADDITION or are the only effects depending on skill type.
        // But for "Stackable" check, we want to know if *any* currently active effect is stackable.

        // Let's check both the selected active level AND the Ex level if enabled.
        // If EITHER has stackable effects, we return the skill.

        let hasStackable = false;

        // Check selected level
        if (levelObj && levelObj.effects) {
            // If the found level IS 'Ex' and Ex skills are disabled, skip it.
            if (levelObj.level === 'Ex' && !exEnabled) {
                // Skip
            } else {
                if (levelObj.effects.some(e => e.isStackable)) hasStackable = true;
            }
        }

        // Check Ex level if applicable
        // This is for cases where Ex is SEPARATE from the "active level" (e.g. passive added on top)
        // If the separate Ex level exists, is enabled, and is stackable, we should include it.
        // Note: If findSkillLevel returned Ex, we already handled it above.
        // If findSkillLevel returned non-Ex, we might still have Ex available as separate level.
        if (!hasStackable && isExAvailable && exEnabled && exLevel && exLevel.effects) {
            // Avoid double counting if levelObj IS exLevel?
            // If levelObj === exLevel, we already handled it above.
            if (levelObj !== exLevel) {
                if (exLevel.effects.some(e => e.isStackable)) hasStackable = true;
            }
        }

        return hasStackable;
    });
};

// Helper to count Silent buffs on a character
const countSilentBuffs = (
    character: ParsedCharacterData,
    stackCounts: Record<string, number>,
    activeExSkills: Record<string, boolean>,
    activeSkillLevels: Record<string, string>
): number => {
    let total = 0;
    character.skills.forEach(skill => {
        // Find active level
        const activeLevel = findSkillLevel(skill, character.name || '', activeSkillLevels);

        // Items to check: Active Level and potentially Ex Level
        const levelsToCheck = [];
        if (activeLevel) levelsToCheck.push(activeLevel);

        // Ex logic: If Ex is enabled and exists as a separate level
        const exLevel = skill.levels.find(l => l.level === 'Ex');
        const exEnabled = activeExSkills[character.name || ''] !== false;
        if (exLevel && exEnabled && activeLevel !== exLevel) {
            levelsToCheck.push(exLevel);
        }

        levelsToCheck.forEach(lvl => {
            if (lvl.effects) {
                lvl.effects.forEach(eff => {
                    // Check if it's a Silent buff
                    // Typically targets Self, but we count any Silent buff generated by this character
                    if (eff.type === 'Buff' && eff.attribute === 'Silent') {
                        let count = 1;
                        if (eff.isStackable) {
                            count = stackCounts[skill.name] ?? 1;
                        }
                        total += eff.value * count;
                    }
                });
            }
        });
    });
    return total;
};
