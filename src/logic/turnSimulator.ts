import type { ParsedCharacterData } from './wikiParser';

export interface Action {
    round: number;
    globalTurn: number;
    actorIndex: number;
    actorName: string;
    actorRole: string; // 'Attacker', 'Supporter', 'Defender', 'Boss', etc.
    actorType: string; // '攻撃型', '支援型', etc.
    supportTargetNames?: string[];
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

            actions.push({
                round,
                globalTurn,
                actorIndex: index,
                actorName: character.name || `Character ${index + 1}`,
                actorRole: character.role || 'Unknown',
                actorType: character.type?.replace(/型$/, '型') || getTypeName(character.role || ''),
                supportTargetNames
            });
            globalTurn++;

            // Boss acts after the first non-supporter acts
            if (!bossActed) {
                const isSupporter = character.role === 'Supporter' || character.type?.includes('支援');
                if (!isSupporter) {
                    actions.push({
                        round,
                        globalTurn,
                        actorIndex: -1,
                        actorName: 'Boss',
                        actorRole: 'Boss',
                        actorType: 'Boss'
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
                actorType: 'Boss'
            });
            globalTurn++;
            bossActed = true;
        }
    }

    return actions;
};
