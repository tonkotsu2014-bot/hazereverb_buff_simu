import type { ParsedCharacterData, SkillEffect } from './wikiParser';

export interface CalculatedBuffs {
    attackIncreasePercent: number;
    critRateTotal: number;
    critDamageTotal: number;
}

export const calculateMaxBuffs = (
    attacker: ParsedCharacterData,
    supporters: ParsedCharacterData[],
    stackCounts: Record<string, number> = {}
): CalculatedBuffs => {
    let attackIncreasePercent = 0;
    let critRateBuff = 0;
    let critDamageBuff = 0;

    // Helper to process effects
    const processEffects = (effects: SkillEffect[], character: ParsedCharacterData, isAttacker: boolean, skillName: string) => {
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

                if (effect.calculationType === 'SupportScaling') {
                    // Support Power is stored in 'attack' field for Support characters (and seemingly generally used there)
                    const supportPower = typeof character.stats?.attack === 'number'
                        ? character.stats.attack
                        : parseFloat(character.stats?.attack || '0');
                    value = supportPower * (effect.value / 100);
                }

                // Apply Stacks
                if (effect.isStackable) {
                    const count = stackCounts[skillName] ?? 1;
                    if (count > 1) {
                        value = value * count;
                    }
                }

                // Negate for Debuffs
                if (isDebuff) {
                    value = -value;
                }

                if (effect.attribute === 'Attack') {
                    // Attack buffs are usually percentage based increases
                    attackIncreasePercent += value;
                } else if (effect.attribute === 'CritRate') {
                    critRateBuff += value;
                } else if (effect.attribute === 'CritDamage') {
                    critDamageBuff += value;
                }
            }
        });
    };

    // 1. Process Attacker's own skills (Max Level assumed for simulation simplicity or we need to select level)
    // For this simulation, let's assume we use the highest level available for each skill.
    attacker.skills.forEach(skill => {
        const maxLevel = skill.levels[skill.levels.length - 1];
        if (maxLevel && maxLevel.effects) {
            processEffects(maxLevel.effects, attacker, true, skill.name);
        }
    });

    // 2. Process Supporters' skills
    supporters.forEach(supporter => {
        supporter.skills.forEach(skill => {
            const maxLevel = skill.levels[skill.levels.length - 1];
            if (maxLevel && maxLevel.effects) {
                processEffects(maxLevel.effects, supporter, false, skill.name);
            }
        });
    });

    // Base stats
    const baseCritRate = typeof attacker.stats?.critRate === 'number' ? attacker.stats.critRate : parseFloat(attacker.stats?.critRate || '0');
    const baseCritDamage = typeof attacker.stats?.critDamage === 'number' ? attacker.stats.critDamage : parseFloat(attacker.stats?.critDamage || '0');

    return {
        attackIncreasePercent,
        critRateTotal: baseCritRate + critRateBuff,
        critDamageTotal: baseCritDamage + critDamageBuff
    };
};
