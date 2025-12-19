
import type { ParsedCharacterData, SkillEffect } from './wikiParser';

export interface ReceivedSkillEffect {
    attribute: string;
    value: number;
    type: string; // 'Buff' | 'Debuff'
    scalingFactor?: string;
}

export interface ReceivedSkill {
    name: string;
    source: string; // Actor who provided the skill
    effects: ReceivedSkillEffect[];
}

export interface CharacterState {
    name: string;
    receivedSkills: ReceivedSkill[];
}

export interface Action {
    round: number;
    globalTurn: number;
    actorIndex: number;
    actorName: string;
    actorRole: string; // 'Attacker', 'Supporter', 'Defender', 'Boss', etc.
    actorType: string; // '攻撃型', '支援型', etc.
    supportTargetNames?: string[];
    characterStates: CharacterState[];
}

export interface SimulationCharacter extends ParsedCharacterData {
    id?: string;
    deathRound?: number;
    supportTargetIndices?: number[];
    exSkillRounds?: number[];
}

/**
 * Simulates the turn order for a given party over a specified number of rounds.
 * 
 * @param party The list of characters in the party (max 9). Order in array determines action order within a round.
 * @param maxRounds The number of rounds to simulate.
 * @returns An array of Actions representing the turn order.
 */
export const simulateTurns = (
    party: (SimulationCharacter | null)[],
    maxRounds: number
): Action[] => {
    const actions: Action[] = [];
    let globalTurn = 1;

    // Track accumulated skills for each character index
    const accumulatedSkills: ReceivedSkill[][] = party.map(() => []);

    // Helper to get Japanese type name from Role
    const getTypeName = (role: string): string => {
        switch (role) {
            case 'Attacker': return '攻撃型';
            case 'Supporter': return '支援型';
            case 'Defender': return '防御型';
            case 'Transcendence': return '超越型';
            case 'Boss': return 'Boss';
            default: return 'その他';
        }
    };

    const getCharacterName = (index: number): string => {
        const char = party[index];
        return char?.name || `Character ${index + 1}`;
    };

    const getSnapshot = (): CharacterState[] => {
        return party.map((p, idx) => ({
            name: p?.name || `Character ${idx + 1}`,
            receivedSkills: accumulatedSkills[idx].map(s => ({
                name: s.name,
                source: s.source,
                effects: s.effects.map(e => ({ ...e })) // Deep clone effects
            }))
        }));
    };

    for (let round = 1; round <= maxRounds; round++) {
        let bossActed = false;
        party.forEach((character, index) => {
            if (!character) {
                throw new Error(`Invalid character in party at index ${index}`);
            }

            // Check if character is dead in this round
            const deathRound = character.deathRound;
            const isDead = deathRound !== undefined && deathRound > 0 && round >= deathRound;

            if (isDead) {
                return; // Skip this character
            }

            // Resolve support targets if applicable
            let supportTargetNames: string[] | undefined;
            if (character.supportTargetIndices && character.supportTargetIndices.length > 0) {
                supportTargetNames = character.supportTargetIndices
                    .filter(idx => {
                        const target = party[idx];
                        if (!target) return false;
                        const dRound = target.deathRound;
                        // Target is alive if no death info or death round is in future
                        return dRound === undefined || dRound <= 0 || round < dRound;
                    })
                    .map(idx => getCharacterName(idx));
            }

            // Logic to Apply Skills
            const isSupporter = character.role === 'Supporter' || character.type?.includes('支援');

            // Helper to add skill if stackable or unique
            const addSkill = (targetIndex: number, skillName: string, source: string, effects: SkillEffect[], isStackable: boolean) => {
                // Check if already received
                const hasSkill = accumulatedSkills[targetIndex].some(s => s.name === skillName && (isStackable || s.source === source));
                // Note: Originally we just checked name. Now that we track source, "unique" usually means unique per source OR unique global?
                // The prompt for "stackable" usually implies "can stack with itself".
                // If it's NOT stackable, it usually means "cannot stack duplicate instances".
                // The previous logic was `!hasSkill` where hasSkill checked `s.name === skillName`.
                // Let's keep the logic simple: if not stackable, check if we already have a skill with this name.

                const alreadyHasSameName = accumulatedSkills[targetIndex].some(s => s.name === skillName);

                if (isStackable || !alreadyHasSameName) {
                    accumulatedSkills[targetIndex].push({
                        name: skillName,
                        source: source,
                        effects: effects.map(e => ({
                            attribute: e.attribute,
                            value: e.value,
                            type: e.type,
                            scalingFactor: e.scalingFactor
                        }))
                    });
                }
            };

            // Get skills to use
            const skillsToUse = character.skills;

            skillsToUse.forEach(skill => {
                const skillName = skill.name;

                // Check if this skill has an 'Ex' level (indicating it's an EX skill)
                const exLevel = skill.levels.find(l => l.level.toLowerCase() === 'ex');
                let isEx = !!exLevel;
                let currentLevel = null;

                // If it is an EX skill, only apply if the current round matches one of the exSkillRounds
                if (isEx && exLevel) {
                    const exRounds = character.exSkillRounds || [];
                    if (exRounds.includes(round)) {
                        currentLevel = exLevel;
                    } else {
                        return; // Skip EX skill if not in activation round
                    }
                } else {
                    // Normal Skill Path (Non-EX)
                    // Find Level 10 or fallback to highest level available
                    let targetLevel = skill.levels.find(l => String(l.level) === '10');
                    if (!targetLevel) {
                        targetLevel = skill.levels.reduce((prev, current) => {
                            // Skip 'Ex' levels in normal fallback
                            if (current.level.toLowerCase() === 'ex') return prev;

                            const pLev = parseInt(String(prev.level)) || 0;
                            const cLev = parseInt(String(current.level)) || 0;
                            return (pLev > cLev) ? prev : current;
                        }, skill.levels[0]);
                    }
                    currentLevel = targetLevel;
                }

                if (!currentLevel) return;

                const originalEffects = currentLevel.effects;

                // --- Resolve Support Scaling & Intra-Skill Buffs ---
                const resolvedEffects: SkillEffect[] = [];
                const intraSkillSupportBuffs: number[] = []; // Store values of support buffs in this skill

                // Helper to calculate current Support Power
                const calculateCurrentSupportPower = (): number => {
                    const baseSupport = (() => {
                        const stats = character.stats;
                        if (!stats) return 0;
                        if ((stats as any).Support !== undefined) {
                            return typeof (stats as any).Support === 'number' ? (stats as any).Support : parseFloat((stats as any).Support);
                        }
                        return 0;
                    })();

                    let supportIncrease = 0;

                    // 1. Existing Buffs (from previous turns or previous skills this turn)
                    // accumulatedSkills is ReceivedSkill[][]. accumulatedSkills[index] is this char's skills.
                    accumulatedSkills[index].forEach(receivedSkill => {
                        receivedSkill.effects.forEach(eff => {
                            if (eff.attribute === 'Support') {
                                if (eff.type === 'Buff') {
                                    supportIncrease += eff.value;
                                } else if (eff.type === 'Debuff') {
                                    supportIncrease -= eff.value;
                                }
                            }
                        });
                    });

                    // 2. Intra-Skill Buffs (applied by earlier effects in this same skill)
                    intraSkillSupportBuffs.forEach(val => supportIncrease += val);

                    return baseSupport + supportIncrease;
                };

                originalEffects.forEach(effect => {
                    let value = effect.value;

                    if (effect.calculationType === 'SupportScaling') {
                        const supportPower = calculateCurrentSupportPower();
                        // Scaling: SupportPower * (Value / 100)
                        value = supportPower * (value / 100);
                    }

                    // Check if this effect ITSELF is a Support Buff that should affect subsequent effects
                    let targetsCaster = false;
                    const targetType = effect.target;

                    if (targetType === 'Self' || targetType === 'AllAllies') {
                        targetsCaster = true;
                    } else if (!targetType) {
                        if (isSupporter && character.supportTargetIndices && character.supportTargetIndices.length > 0) {
                            targetsCaster = false;
                        } else {
                            targetsCaster = true;
                        }
                    }

                    if (targetsCaster && effect.attribute === 'Support' && effect.type === 'Buff') {
                        intraSkillSupportBuffs.push(value);
                    }

                    resolvedEffects.push({ ...effect, value: value });
                });

                const effects = resolvedEffects;
                const target = effects[0]?.target;
                const isStackable = effects[0]?.isStackable ?? false;

                if (target) {
                    if (target === 'Self') {
                        addSkill(index, skillName, character.name || 'Unknown', effects, isStackable);
                    } else if (target === 'AllAllies') {
                        // Apply to everyone including self
                        party.forEach((_, pIdx) => {
                            if (!party[pIdx]?.deathRound || party[pIdx]!.deathRound! > round) {
                                addSkill(pIdx, skillName, character.name || 'Unknown', effects, isStackable);
                            }
                        });
                    } else if ((target === 'Support' || target === 'Default') && isSupporter && character.supportTargetIndices && character.supportTargetIndices.length > 0) {
                        // Apply to support targets
                        character.supportTargetIndices.forEach(tIdx => {
                            // Check if target alive
                            const tChar = party[tIdx];
                            if (tChar && (!tChar.deathRound || tChar.deathRound > round)) {
                                addSkill(tIdx, skillName, character.name || 'Unknown', effects, isStackable);
                            }
                        });
                    } else {
                        // Default / other targets (Self)
                        addSkill(index, skillName, character.name || 'Unknown', effects, isStackable);
                    }
                } else {
                    // If no target specified (e.g. passive), usually Self
                    // But if it's a Supporter with targets, assume Support target?
                    if (isSupporter && character.supportTargetIndices && character.supportTargetIndices.length > 0) {
                        character.supportTargetIndices.forEach(tIdx => {
                            const tChar = party[tIdx];
                            if (tChar && (!tChar.deathRound || tChar.deathRound > round)) {
                                addSkill(tIdx, skillName, character.name || 'Unknown', effects, isStackable);
                            }
                        });
                    } else {
                        addSkill(index, skillName, character.name || 'Unknown', effects, isStackable);
                    }
                }
            });

            // Action Snapshot
            actions.push({
                round,
                globalTurn: globalTurn++,
                actorIndex: index,
                actorName: character.name || 'Unknown',
                actorRole: character.role || 'Unknown',
                actorType: getTypeName(character.role || ''),
                supportTargetNames,
                characterStates: getSnapshot()
            });

            // Boss Action Check
            const allowsContinuous = character.role === 'Supporter';

            if (!allowsContinuous && !bossActed) {
                // Boss Turn
                bossActed = true;
                actions.push({
                    round,
                    globalTurn: globalTurn++,
                    actorIndex: -1,
                    actorName: 'Boss',
                    actorRole: 'Boss',
                    actorType: 'Boss',
                    characterStates: getSnapshot()
                });
            }
        });

        // If Boss hasn't acted by end of round
        if (!bossActed) {
            actions.push({
                round,
                globalTurn: globalTurn++,
                actorIndex: -1,
                actorName: 'Boss',
                actorRole: 'Boss',
                actorType: 'Boss',
                characterStates: getSnapshot()
            });
        }
    }

    return actions;
};
