
import type { ParsedCharacterData, SkillEffect, SkillLevel } from './wikiParser';

export interface ReceivedSkillEffect {
    attribute: string;
    value: number;
    type: string; // 'Buff' | 'Debuff'
    scalingFactor?: string;
    actuatorSupportPower?: number;
    duration?: number;
    remainingTurn?: number;
}

export interface ReceivedSkill {
    name: string;
    source: string; // Actor who provided the skill
    startRound: number;
    startGlobalTurn: number;
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

    const getSnapshot = (currentRound: number, currentGlobalTurn: number): CharacterState[] => {
        return party.map((p, idx) => ({
            name: p?.name || `Character ${idx + 1}`,
            receivedSkills: accumulatedSkills[idx].map(s => {
                // Determine remaining turns for each effect using GLOBAL TURN
                // Calculation: Rem = Duration - (CurrentGlobalTurn - StartGlobalTurn)
                const elapsed = currentGlobalTurn - s.startGlobalTurn;

                const activeEffects = s.effects
                    .map(e => {
                        let rem: number | undefined;
                        if (e.duration !== undefined) {
                            if (e.duration === -1) {
                                rem = -1; // Permanent
                            } else {
                                rem = Math.max(0, e.duration - elapsed);
                            }
                        }
                        return {
                            ...e,
                            remainingTurn: rem
                        };
                    })
                    .filter(e => e.remainingTurn === undefined || e.remainingTurn > 0 || e.remainingTurn === -1);

                return {
                    name: s.name,
                    source: s.source,
                    startRound: s.startRound,
                    startGlobalTurn: s.startGlobalTurn,
                    effects: activeEffects
                };
            }).filter(s => s.effects.length > 0)
        }));
    };

    const executeTurn = (
        index: number,
        round: number
    ): { acted: boolean, role: string } => {
        const character = party[index];
        if (!character) {
            throw new Error(`Invalid character in party at index ${index}`);
        }

        // Check if character is dead in this round
        const deathRound = character.deathRound;
        const isDead = deathRound !== undefined && deathRound > 0 && round >= deathRound;

        if (isDead) {
            return { acted: false, role: 'Dead' };
        }

        const skillsToApply: { skillName: string, level: any }[] = [];

        // Check for active EX Skill
        const exRounds = character.exSkillRounds || [];
        const isExActive = exRounds.includes(round);

        character.skills.forEach(skill => {
            const skillName = skill.name;
            const exLevel = skill.levels.find(l => l.level.toLowerCase() === 'ex');
            const isEx = !!exLevel;

            if (isEx) {
                if (isExActive && exLevel) {
                    skillsToApply.push({ skillName, level: exLevel });
                }
            } else {
                let targetLevel: SkillLevel | undefined;

                if (skill.activeLevel) {
                    // 1. Try exact match
                    targetLevel = skill.levels.find(l => String(l.level) === String(skill.activeLevel));

                    // 2. Try floor match (highest level <= activeLevel)
                    if (!targetLevel) {
                        const targetVal = parseInt(skill.activeLevel);
                        if (!isNaN(targetVal)) {
                            // Helper to parse level safely
                            const parseLevel = (l: string) => {
                                const v = parseInt(l);
                                return isNaN(v) ? -1 : v;
                            };

                            const candidate = skill.levels
                                .filter(l => l.level.toLowerCase() !== 'ex' && parseLevel(l.level) <= targetVal)
                                .sort((a, b) => parseLevel(b.level) - parseLevel(a.level))[0]; // Descending sort, take first

                            if (candidate) {
                                targetLevel = candidate;
                            }
                        }
                    }
                }

                // 3. Fallback: try '10' (legacy default) or highest available
                if (!targetLevel) {
                    targetLevel = skill.levels.find(l => String(l.level) === '10');
                }

                if (!targetLevel) {
                    targetLevel = skill.levels.reduce((prev, current) => {
                        if (current.level.toLowerCase() === 'ex') return prev;
                        const pLev = parseInt(String(prev.level)) || 0;
                        const cLev = parseInt(String(current.level)) || 0;
                        return (pLev > cLev) ? prev : current;
                    }, skill.levels[0]);
                }
                if (targetLevel) {
                    skillsToApply.push({ skillName, level: targetLevel });
                }
            }
        });

        // Ensure EX skills are applied first
        skillsToApply.sort((a, b) => {
            const aIsEx = a.level.level.toLowerCase() === 'ex';
            const bIsEx = b.level.level.toLowerCase() === 'ex';
            if (aIsEx && !bIsEx) return -1;
            if (!aIsEx && bIsEx) return 1;
            return 0;
        });

        const isSupporter = character.role === 'Supporter' || character.type?.includes('支援');
        let supportTargetNames: string[] | undefined;
        if (character.supportTargetIndices && character.supportTargetIndices.length > 0) {
            supportTargetNames = character.supportTargetIndices
                .filter(idx => {
                    const target = party[idx];
                    if (!target) return false;
                    const dRound = target.deathRound;
                    return dRound === undefined || dRound <= 0 || round < dRound;
                })
                .map(idx => getCharacterName(idx));
        }

        const addSkill = (targetIndex: number, skillName: string, source: string, effects: {
            attribute: string;
            value: number;
            type: string;
            scalingFactor?: string;
            actuatorSupportPower?: number;
            duration?: number;
        }[], isStackable: boolean) => {
            const alreadyHasSameNameIndex = accumulatedSkills[targetIndex].findIndex(s => s.name === skillName);

            const newSkill: ReceivedSkill = {
                name: skillName,
                source: source,
                startRound: round, // Capture start round
                startGlobalTurn: globalTurn, // Capture start global turn
                effects: effects.map(e => ({
                    attribute: e.attribute,
                    value: e.value,
                    type: e.type,
                    scalingFactor: e.scalingFactor,
                    actuatorSupportPower: e.actuatorSupportPower,
                    duration: e.duration,
                    // remainingTurn will be calculated in snapshot
                }))
            };

            const MAX_STACK_COUNT = 5;

            if (isStackable) {
                // Enforce max 5 stacks
                const existingStacksCount = accumulatedSkills[targetIndex].filter(s => s.name === skillName).length;
                if (existingStacksCount >= MAX_STACK_COUNT) {
                    const oldestIndex = accumulatedSkills[targetIndex].findIndex(s => s.name === skillName);
                    if (oldestIndex !== -1) {
                        accumulatedSkills[targetIndex].splice(oldestIndex, 1);
                    }
                }
                accumulatedSkills[targetIndex].push(newSkill);
            } else if (alreadyHasSameNameIndex !== -1) {
                // Overwrite existing (Resetting startRound and duration implicitly by replacement)
                accumulatedSkills[targetIndex][alreadyHasSameNameIndex] = newSkill;
            } else {
                accumulatedSkills[targetIndex].push(newSkill);
            }
        };

        // Apply Steps
        skillsToApply.forEach(({ skillName, level: currentLevel }) => {
            const originalEffects = currentLevel.effects;
            const resolvedEffects: ReceivedSkillEffect[] = []; // Reuse interface for ease
            const intraSkillSupportBuffs: number[] = [];

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
                accumulatedSkills[index].forEach(receivedSkill => {
                    // Check logic for expired buffs here?
                    // Currently logic assumes all buffs valid?
                    // Better to check expiration logic here too.
                    // Check logic for expired buffs here?
                    // Currently logic assumes all buffs valid?
                    // Better to check expiration logic here too.
                    // NOTE: Intra-turn support calculation should use globalTurn too?
                    // For now keeping consistent with snapshot logic:
                    const elapsed = globalTurn - receivedSkill.startGlobalTurn;

                    receivedSkill.effects.forEach(eff => {
                        let isActive = true;
                        if (eff.duration !== undefined) {
                            if (eff.duration === -1) {
                                isActive = true;
                            } else if (elapsed >= eff.duration) {
                                isActive = false;
                            }
                        }

                        if (isActive && eff.attribute === 'Support') {
                            if (eff.type === 'Buff') supportIncrease += eff.value;
                            else if (eff.type === 'Debuff') supportIncrease -= eff.value;
                        }
                    });
                });
                intraSkillSupportBuffs.forEach(val => supportIncrease += val);
                return baseSupport + supportIncrease;
            };

            originalEffects.forEach((effect: SkillEffect) => {
                let value = effect.value;
                let currentSupportPower: number | undefined;

                if (effect.calculationType === 'SupportScaling') {
                    const supportPower = calculateCurrentSupportPower();
                    currentSupportPower = supportPower;
                    value = supportPower * (value / 100);
                }

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

                const resolvedEffect: ReceivedSkillEffect = {
                    attribute: effect.attribute,
                    value: value,
                    type: effect.type,
                    scalingFactor: effect.scalingFactor ? String(effect.scalingFactor) : undefined,
                    actuatorSupportPower: currentSupportPower,
                    duration: effect.duration
                };

                resolvedEffects.push(resolvedEffect);
            });

            const effects = resolvedEffects;

            const firstOriginalEffect = originalEffects[0];
            const targetType = firstOriginalEffect?.target;
            const isStackable = firstOriginalEffect?.isStackable ?? false;

            if (targetType) {
                if (targetType === 'Self') {
                    addSkill(index, skillName, character.name || 'Unknown', effects, isStackable);
                } else if (targetType === 'AllAllies') {
                    party.forEach((_, pIdx) => {
                        if (!party[pIdx]?.deathRound || party[pIdx]!.deathRound! > round) {
                            addSkill(pIdx, skillName, character.name || 'Unknown', effects, isStackable);
                        }
                    });
                } else if ((targetType === 'Support' || targetType === 'Default') && isSupporter && character.supportTargetIndices && character.supportTargetIndices.length > 0) {
                    character.supportTargetIndices.forEach(tIdx => {
                        const tChar = party[tIdx];
                        if (tChar && (!tChar.deathRound || tChar.deathRound > round)) {
                            addSkill(tIdx, skillName, character.name || 'Unknown', effects, isStackable);
                        }
                    });
                } else {
                    addSkill(index, skillName, character.name || 'Unknown', effects, isStackable);
                }
            } else {
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

        const currentGlobalTurn = globalTurn++;
        actions.push({
            round,
            globalTurn: currentGlobalTurn,
            actorIndex: index,
            actorName: character.name || 'Unknown',
            actorRole: character.role || 'Unknown',
            actorType: getTypeName(character.role || ''),
            supportTargetNames,
            characterStates: getSnapshot(round, currentGlobalTurn)
        });

        return { acted: true, role: character.role || 'Unknown' };
    };

    const pushBossAction = (round: number) => {
        const currentGlobalTurn = globalTurn++;
        actions.push({
            round,
            globalTurn: currentGlobalTurn,
            actorIndex: -1,
            actorName: 'Boss',
            actorRole: 'Boss',
            actorType: 'Boss',
            characterStates: getSnapshot(round, currentGlobalTurn)
        });
    };

    for (let round = 1; round <= maxRounds; round++) {
        let bossActed = false;
        const actedIndices = new Set<number>();

        // Phase 1: EX Skills
        party.forEach((character, index) => {
            if (!character) return;
            const exRounds = character.exSkillRounds || [];
            if (exRounds.includes(round)) {
                const { acted, role } = executeTurn(index, round);
                actedIndices.add(index);
                if (acted) {
                    const allowsContinuous = role === 'Supporter';
                    if (!allowsContinuous && !bossActed) {
                        bossActed = true;
                        pushBossAction(round);
                    }
                }
            }
        });

        // Phase 2: Normal
        party.forEach((_, index) => {
            if (actedIndices.has(index)) return;
            const { acted, role } = executeTurn(index, round);
            if (acted) {
                const allowsContinuous = role === 'Supporter';
                if (!allowsContinuous && !bossActed) {
                    bossActed = true;
                    pushBossAction(round);
                }
            }
        });

        if (!bossActed) {
            pushBossAction(round);
        }
    }

    return actions;
};
