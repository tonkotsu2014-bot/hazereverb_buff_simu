import type { ParsedCharacterData } from './wikiParser';

export interface Action {
    round: number;
    globalTurn: number;
    actorIndex: number;
    actorName: string;
}

/**
 * Simulates the turn order for a given party over a specified number of rounds.
 * 
 * @param party The list of characters in the party (max 9). Order in array determines action order within a round.
 * @param maxRounds The number of rounds to simulate.
 * @returns An array of Actions representing the turn order.
 */
export const simulateTurns = (party: (ParsedCharacterData | null)[], maxRounds: number): Action[] => {
    const actions: Action[] = [];
    let globalTurn = 1;

    for (let round = 1; round <= maxRounds; round++) {
        let bossActed = false;
        party.forEach((character, index) => {
            if (!character) {
                throw new Error(`Invalid character in party at index ${index}`);
            }

            actions.push({
                round,
                globalTurn,
                actorIndex: index,
                actorName: character.name || `Character ${index + 1}`
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
                        actorName: 'Boss'
                    });
                    globalTurn++;
                    bossActed = true;
                }
            }
        });

        // Safety fallback: if boss hasn't acted by end of round (e.g. all supporters), boss acts at end?
        // User spec didn't explicitly say what happens if ONLY supporters are present.
        // "Boss character acts after non-support character... acts."
        // If there are no non-support characters, strictly speaking the condition is never met.
        // However, in a game, the boss presumably acts *sometime*.
        // But let's stick to the strict requirement first: "After ... moves".
        // If the user meant "At the end of round if not acted", that's an assumption.
        // I will stick to the explicit instruction. If the party is all supporters, Boss might not act based on this logic.
        // Wait, "Boss acts after ... first non-supporter ... acts".
        // Let's assume standard behavior constitutes at least one derived non-supporter or Boss acts at end.
        // For now, I'll implement exactly as requested.
    }

    return actions;
};
