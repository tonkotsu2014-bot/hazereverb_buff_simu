import type { ParsedCharacterData } from './wikiParser';

export interface Action {
    round: number;
    globalTurn: number;
    actorIndex: number;
    actorName: string;
    actorRole: string; // 'Attacker', 'Supporter', 'Defender', 'Boss', etc.
    actorType: string; // '攻撃型', '支援型', etc.
}

export interface DeathInfo {
    characterIndex: number;
    deathRound: number;
}

/**
 * Simulates the turn order for a given party over a specified number of rounds.
 * 
 * @param party The list of characters in the party (max 9). Order in array determines action order within a round.
 * @param maxRounds The number of rounds to simulate.
 * @param deaths Optional list of death information (character index and round they die).
 * @returns An array of Actions representing the turn order.
 */
export const simulateTurns = (
    party: (ParsedCharacterData | null)[],
    maxRounds: number,
    deaths: DeathInfo[] = []
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

    for (let round = 1; round <= maxRounds; round++) {
        let bossActed = false;
        party.forEach((character, index) => {
            if (!character) {
                throw new Error(`Invalid character in party at index ${index}`);
            }

            // Check if character is dead in this round
            const isDead = deaths.some(d => d.characterIndex === index && round >= d.deathRound);
            if (isDead) {
                return; // Skip this character
            }

            actions.push({
                round,
                globalTurn,
                actorIndex: index,
                actorName: character.name || `Character ${index + 1}`,
                actorRole: character.role || 'Unknown',
                actorType: character.type?.replace(/型$/, '型') || getTypeName(character.role || '')
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
