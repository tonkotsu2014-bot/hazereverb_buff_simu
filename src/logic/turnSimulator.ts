
import type { ParsedCharacterData, SkillEffect } from './wikiParser';

export interface ReceivedSkillEffect {
    attribute: string;
    value: number;
    type: string; // 'Buff' | 'Debuff'
    scalingFactor?: string;
    actuatorSupportPower?: number;
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
                // Only add EX skill if active this round
                if (isExActive && exLevel) {
                    skillsToApply.push({ skillName, level: exLevel });
                }
            } else {
                // Normal Skill Logic
                let targetLevel = skill.levels.find(l => String(l.level) === '10');
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

        // Ensure EX skills are applied first if multiple skills selected (EX + Normal)
        skillsToApply.sort((a, b) => {
            const aIsEx = a.level.level.toLowerCase() === 'ex';
            const bIsEx = b.level.level.toLowerCase() === 'ex';
            if (aIsEx && !bIsEx) return -1;
            if (!aIsEx && bIsEx) return 1;
            return 0;
        });

        // If no skills to apply (shouldn't happen for valid char unless passing), but check.
        // For Normal turn, usually at least one skill.
        if (skillsToApply.length === 0) {
            // Acted even if pass?
        }

        // Logic to apply skills...
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
        }[], isStackable: boolean) => {
            const alreadyHasSameNameIndex = accumulatedSkills[targetIndex].findIndex(s => s.name === skillName);

            if (isStackable) {
                accumulatedSkills[targetIndex].push({
                    name: skillName,
                    source: source,
                    effects: effects.map(e => ({ ...e }))
                });
            } else if (alreadyHasSameNameIndex !== -1) {
                accumulatedSkills[targetIndex][alreadyHasSameNameIndex] = {
                    name: skillName,
                    source: source,
                    effects: effects.map(e => ({ ...e }))
                };
            } else {
                accumulatedSkills[targetIndex].push({
                    name: skillName,
                    source: source,
                    effects: effects.map(e => ({ ...e }))
                });
            }
        };

        // Apply Steps
        skillsToApply.forEach(({ skillName, level: currentLevel }) => {
            const originalEffects = currentLevel.effects;
            const resolvedEffects: SkillEffect[] = [];
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
                    receivedSkill.effects.forEach(eff => {
                        if (eff.attribute === 'Support') {
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

                const resolvedEffect: any = { ...effect, value: value };
                if (currentSupportPower !== undefined) {
                    resolvedEffect.actuatorSupportPower = currentSupportPower;
                }
                resolvedEffects.push(resolvedEffect);
            });

            const effects = resolvedEffects;
            const target = effects[0]?.target;
            const isStackable = effects[0]?.isStackable ?? false;

            if (target) {
                if (target === 'Self') {
                    addSkill(index, skillName, character.name || 'Unknown', effects, isStackable);
                } else if (target === 'AllAllies') {
                    party.forEach((_, pIdx) => {
                        if (!party[pIdx]?.deathRound || party[pIdx]!.deathRound! > round) {
                            addSkill(pIdx, skillName, character.name || 'Unknown', effects, isStackable);
                        }
                    });
                } else if ((target === 'Support' || target === 'Default') && isSupporter && character.supportTargetIndices && character.supportTargetIndices.length > 0) {
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

        // ONE Action snapshot for the whole turn (whether EX+Normal or just Normal)
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

        return { acted: true, role: character.role || 'Unknown' };
    };

    const pushBossAction = (round: number) => {
        actions.push({
            round,
            globalTurn: globalTurn++,
            actorIndex: -1,
            actorName: 'Boss',
            actorRole: 'Boss',
            actorType: 'Boss',
            characterStates: getSnapshot()
        });
    };

    for (let round = 1; round <= maxRounds; round++) {
        let bossActed = false;

        // Track characters who have acted in this round
        const actedIndices = new Set<number>();

        // Phase 1: Characters with EX Skills (Priority Execution)
        // They execute their combined turn (EX + Normal) now.
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

        // Phase 2: Remaining Characters (Normal Turn execution)
        party.forEach((_, index) => {
            if (actedIndices.has(index)) return; // Already acted in EX phase

            const { acted, role } = executeTurn(index, round);

            if (acted) {
                const allowsContinuous = role === 'Supporter';
                if (!allowsContinuous && !bossActed) {
                    bossActed = true;
                    pushBossAction(round);
                }
            }
        });

        // If Boss hasn't acted by end of round
        if (!bossActed) {
            pushBossAction(round);
        }
    }

    return actions;
};
