
import type { ParsedCharacterData, SkillEffect, SkillLevel } from './wikiParser';
import { DEFAULT_BOSS } from './bossData';

export interface ReceivedSkillEffect {
    attribute: string;
    value: number;
    type: string; // 'Buff' | 'Debuff'
    scalingFactor?: string;
    actuatorSupportPower?: number;
    duration?: number;
    remainingTurn?: number;
    isStackable?: boolean;
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
    actorId?: string; // Unique ID to identify the character
    supportTargetNames?: string[];
    characterStates: CharacterState[];
}

export interface BossContext {
    party: (SimulationCharacter | null)[];
    accumulatedSkills: ReceivedSkill[][];
    round: number;
    globalTurn: number;
    actions: Action[];
}

export interface SimulationCharacter extends ParsedCharacterData {
    id?: string;
    deathRound?: number;
    supportTargetIndices?: number[];
    exSkillRounds?: number[];
    // Boss specific: function to execute custom logic during boss turn
    onAction?: (context: BossContext) => void;
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
    maxRounds: number,
    boss?: SimulationCharacter | null
): Action[] => {
    const actions: Action[] = [];
    let globalTurn = 1;

    const currentBoss = boss ?? DEFAULT_BOSS;

    // Track accumulated skills for each character index
    const accumulatedSkills: ReceivedSkill[][] = party.map(() => []);

    // Helper to check if a character is dead
    const isCharacterDead = (character: SimulationCharacter | null, currentRound: number): boolean => {
        if (!character) return true;
        const { deathRound } = character;
        // Alive if deathRound is undefined, 0, or negative.
        // Dead if deathRound > 0 and currentRound >= deathRound.
        return deathRound !== undefined && deathRound > 0 && currentRound >= deathRound;
    };

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

    const getSnapshot = (_currentRound: number, currentGlobalTurn: number): CharacterState[] => {
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

    const resolveSkillsToApply = (character: SimulationCharacter, round: number) => {
        const skillsToApply: { skillName: string, level: SkillLevel }[] = [];
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

        return skillsToApply;
    };

    const addSkill = (targetIndex: number, skillName: string, source: string, round: number, effects: {
        attribute: string;
        value: number;
        type: string;
        scalingFactor?: string;
        actuatorSupportPower?: number;
        duration?: number;
        isStackable?: boolean;
    }[]) => {
        const MAX_STACK_COUNT = 5;

        // 1. Process existing skills of the same name
        for (let i = accumulatedSkills[targetIndex].length - 1; i >= 0; i--) {
            const skill = accumulatedSkills[targetIndex][i];
            if (skill.name === skillName) {
                skill.effects = skill.effects.filter(e => e.isStackable);

                if (skill.effects.length === 0) {
                    accumulatedSkills[targetIndex].splice(i, 1);
                }
            }
        }

        const newSkill: ReceivedSkill = {
            name: skillName,
            source: source,
            startRound: round,
            startGlobalTurn: globalTurn,
            effects: effects.map(e => ({
                attribute: e.attribute,
                value: e.value,
                type: e.type,
                scalingFactor: e.scalingFactor,
                actuatorSupportPower: e.actuatorSupportPower,
                duration: e.duration,
                isStackable: e.isStackable
            }))
        };

        const existingStacksCount = accumulatedSkills[targetIndex].filter(s => s.name === skillName).length;
        if (existingStacksCount >= MAX_STACK_COUNT) {
            const oldestIndex = accumulatedSkills[targetIndex].findIndex(s => s.name === skillName);
            if (oldestIndex !== -1) {
                accumulatedSkills[targetIndex].splice(oldestIndex, 1);
            }
        }
        accumulatedSkills[targetIndex].push(newSkill);
    };

    const processEffects = (
        index: number,
        round: number,
        skillsToApply: { skillName: string, level: SkillLevel }[],
        timingFilter: (timing?: string) => boolean
    ) => {
        const character = party[index];
        if (!character) return;

        const isSupporter = character.role === 'Supporter' || character.type?.includes('支援');
        if (character.supportTargetIndices && character.supportTargetIndices.length > 0) {
            // supportTargetNames unused
        }

        skillsToApply.forEach(({ skillName, level: currentLevel }) => {
            // Filter effects based on timing
            const applicableEffects = currentLevel.effects.filter(e => timingFilter(e.timing));
            if (applicableEffects.length === 0) return;

            const originalEffects = applicableEffects;
            const resolvedEffects: {
                attribute: string;
                value: number;
                type: string;
                scalingFactor?: string;
                actuatorSupportPower?: number;
                duration?: number;
                isStackable?: boolean;
            }[] = [];
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
                } else if (effect.calculationType === 'SilentScaling') {
                    let silentCount = 0;
                    accumulatedSkills[index].forEach(receivedSkill => {
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
                            if (isActive && eff.attribute === 'Silent' && eff.type === 'Buff') {
                                silentCount += eff.value;
                            }
                        });
                    });
                    value = silentCount * value;
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

                const resolvedEffect = {
                    attribute: effect.attribute,
                    value: value,
                    type: effect.type,
                    scalingFactor: effect.scalingFactor ? String(effect.scalingFactor) : undefined,
                    actuatorSupportPower: currentSupportPower,
                    duration: effect.duration,
                    isStackable: effect.isStackable
                };

                resolvedEffects.push(resolvedEffect);
            });

            // Group resolved effects by target index
            const effectsByTargetIndex = new Map<number, typeof resolvedEffects>();

            const addEffectToTarget = (tIdx: number, effect: typeof resolvedEffects[0]) => {
                const targetChar = party[tIdx];
                if (!isCharacterDead(targetChar, round)) {
                    if (!effectsByTargetIndex.has(tIdx)) {
                        effectsByTargetIndex.set(tIdx, []);
                    }
                    effectsByTargetIndex.get(tIdx)!.push(effect);
                }
            };

            resolvedEffects.forEach((resolvedEffect, i) => {
                const originalEffect = originalEffects[i];
                const targetType = originalEffect.target;

                if (targetType) {
                    if (targetType === 'Self') {
                        addEffectToTarget(index, resolvedEffect);
                    } else if (targetType === 'AllAllies') {
                        party.forEach((_, pIdx) => {
                            addEffectToTarget(pIdx, resolvedEffect);
                        });
                    } else if ((targetType === 'Support' || targetType === 'Default') && isSupporter && character.supportTargetIndices && character.supportTargetIndices.length > 0) {
                        character.supportTargetIndices.forEach(tIdx => {
                            addEffectToTarget(tIdx, resolvedEffect);
                        });
                    } else {
                        addEffectToTarget(index, resolvedEffect);
                    }
                } else {
                    if (isSupporter && character.supportTargetIndices && character.supportTargetIndices.length > 0) {
                        character.supportTargetIndices.forEach(tIdx => {
                            addEffectToTarget(tIdx, resolvedEffect);
                        });
                    } else {
                        addEffectToTarget(index, resolvedEffect);
                    }
                }
            });

            effectsByTargetIndex.forEach((effects, tIdx) => {
                const targetChar = party[tIdx];
                if (targetChar) {
                    addSkill(tIdx, skillName, character.name || 'Unknown', round, effects);
                }
            });
        });
    };

    const executeBattleStartPhase = () => {
        party.forEach((character, index) => {
            if (!character) return;
            // Round 0 or 1? Requirement says Battle Start effects apply at Battle Start.
            // Using Round 1 context but separate phase.
            const skills = resolveSkillsToApply(character, 1);
            processEffects(index, 1, skills, (timing) => timing === 'BattleStart');
        });

        // Generate Action for Battle Start
        const currentGlobalTurn = 0; // Or some indicator
        actions.push({
            round: 0,
            globalTurn: currentGlobalTurn,
            actorIndex: -1,
            actorName: '戦闘開始時',
            actorRole: 'System',
            actorType: 'System',
            characterStates: getSnapshot(0, currentGlobalTurn)
        });
    };

    const executeRoundStartPhase = (round: number) => {
        party.forEach((character, index) => {
            if (!character) return;
            const isDead = isCharacterDead(character, round);
            if (isDead) return;

            const skills = resolveSkillsToApply(character, round);
            processEffects(index, round, skills, (timing) => timing === 'RoundStart');
        });

        const currentGlobalTurn = globalTurn;
        actions.push({
            round: round,
            globalTurn: currentGlobalTurn,
            actorIndex: -1,
            actorName: 'ラウンド開始時',
            actorRole: 'System',
            actorType: 'System',
            characterStates: getSnapshot(round, currentGlobalTurn)
        });
    };

    const executeTurn = (index: number, round: number): { acted: boolean, role: string } => {
        const character = party[index];
        if (!character) throw new Error(`Invalid character in party at index ${index}`);

        if (!character) throw new Error(`Invalid character in party at index ${index}`);

        const isDead = isCharacterDead(character, round);
        if (isDead) return { acted: false, role: 'Dead' };

        const skills = resolveSkillsToApply(character, round);

        // 1. Before Action
        processEffects(index, round, skills, (timing) => timing === 'BeforeAction');

        // 2. Action (Default or explicit 'Action')
        processEffects(index, round, skills, (timing) => timing === 'Action' || timing === undefined);

        const currentGlobalTurn = globalTurn++;

        actions.push({
            round,
            globalTurn: currentGlobalTurn,
            actorIndex: index,
            actorId: character.id,
            actorName: character.name || 'Unknown',
            actorRole: character.role || 'Unknown',
            actorType: getTypeName(character.role || ''),
            supportTargetNames: (character.role === 'Supporter' && character.supportTargetIndices) ?
                character.supportTargetIndices.map(i => getCharacterName(i)) : undefined,
            characterStates: getSnapshot(round, currentGlobalTurn)
        });

        return { acted: true, role: character.role || 'Unknown' };
    };

    const pushBossAction = (round: number) => {
        const actorName = currentBoss.name || 'Boss';

        // Execute function-based boss logic
        if (currentBoss.onAction) {
            currentBoss.onAction({
                party,
                accumulatedSkills,
                round,
                globalTurn,
                actions
            });
        }

        const currentGlobalTurn = globalTurn++;
        actions.push({
            round,
            globalTurn: currentGlobalTurn,
            actorIndex: -1,
            actorName: actorName,
            actorRole: 'Boss',
            actorType: 'Boss',
            characterStates: getSnapshot(round, currentGlobalTurn)
        });
    };

    // --- Main Simulation Loop ---

    // 1. Battle Start Phase
    executeBattleStartPhase();

    for (let round = 1; round <= maxRounds; round++) {
        // 2. Round Start Phase
        executeRoundStartPhase(round);

        let bossActed = false;

        party.forEach((_, index) => {
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
