import type { ParsedCharacterData, SkillEffect } from './wikiParser';

export interface CharacterState {
    name: string;
    receivedSkills: string[];
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
    const accumulatedSkills: string[][] = party.map(() => []);

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
            receivedSkills: [...accumulatedSkills[idx]] // Clone array
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
            const addSkill = (targetIndex: number, skillName: string, isStackable: boolean) => {
                if (isStackable || !accumulatedSkills[targetIndex].includes(skillName)) {
                    accumulatedSkills[targetIndex].push(skillName);
                }
            };

            // Get skills to use (Assume all active skills for now, using 1st level)
            const skillsToUse = character.skills;

            skillsToUse.forEach(skill => {
                const skillName = skill.name;
                // Use first level for targeting check. If levels differ in target, this might be inaccurate but sufficient for now.
                // Usually target type doesn't change between levels.
                const firstLevel = skill.levels[0];
                if (!firstLevel) return;

                const effects = firstLevel.effects;
                // Determine if skill is stackable (if any effect is stackable)
                const isStackable = effects.some(e => e.isStackable);

                if (isSupporter) {
                    // Supporter: Apply to support targets
                    if (character.supportTargetIndices) {
                        character.supportTargetIndices.forEach(targetIdx => {
                            // Check if target is alive is mostly handled by player choice, but strictly we should check again
                            const target = party[targetIdx];
                            if (target) {
                                const dRound = target.deathRound;
                                if (dRound === undefined || dRound <= 0 || round < dRound) {
                                    addSkill(targetIdx, skillName, isStackable);
                                }
                            }
                        });
                    }
                } else {
                    // Non-Supporter: Check for Self or AllAllies targets
                    // We assume if *any* effect targets Self/AllAllies, the skill is applied to them.
                    // (Actually we should check each effect, but we track SKILL NAME, so if it hits, it hits)

                    const targetsSelf = effects.some(e => e.target === 'Self');
                    const targetsAll = effects.some(e => e.target === 'AllAllies');

                    if (targetsAll) {
                        party.forEach((p, pIdx) => {
                            if (p && (!p.deathRound || p.deathRound <= 0 || round < p.deathRound)) {
                                addSkill(pIdx, skillName, isStackable);
                            }
                        });
                    } else if (targetsSelf) {
                        addSkill(index, skillName, isStackable);
                    }
                }
            });


            actions.push({
                round,
                globalTurn,
                actorIndex: index,
                actorName: character.name || `Character ${index + 1}`,
                actorRole: character.role || 'Unknown',
                actorType: character.type?.replace(/型$/, '型') || getTypeName(character.role || ''),
                supportTargetNames,
                characterStates: getSnapshot()
            });
            globalTurn++;

            // Boss acts after the first non-supporter acts
            if (!bossActed) {
                if (!isSupporter) {
                    actions.push({
                        round,
                        globalTurn,
                        actorIndex: -1,
                        actorName: 'Boss',
                        actorRole: 'Boss',
                        actorType: 'Boss',
                        characterStates: getSnapshot()
                    });
                    globalTurn++;
                    bossActed = true;
                }
            }
        });

        // If Boss hasn't acted yet (e.g., all characters were Supporters or dead Attacker), Boss acts at the end of the round
        if (!bossActed) {
            actions.push({
                round,
                globalTurn,
                actorIndex: -1,
                actorName: 'Boss',
                actorRole: 'Boss',
                actorType: 'Boss',
                characterStates: getSnapshot()
            });
            globalTurn++;
            bossActed = true;
        }
    }

    return actions;
};
