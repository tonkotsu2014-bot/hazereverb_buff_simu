
import { describe, test, expect } from 'vitest';
import { simulateTurns, SimulationCharacter } from '../src/logic/turnSimulator';

describe('Turn Simulator Order Reproduction', () => {
    test('should match the expected turn order for specific death scenarios', () => {
        // Party Configuration
        // 1. Transcendence A
        // 2. Defender B (Dies 2R)
        // 3. Supporter C
        // 4. Supporter D
        // 5. Attacker E
        // 6. Supporter F
        // 7. Transcendence G
        // 8. Supporter H (Dies 3R)
        // 9. Attacker I (Dies 6R)

        const createChar = (name: string, role: string, deathRound?: number, exRounds?: number[]): SimulationCharacter => ({
            name,
            role: role as any,
            attributes: {
                name, role: role as any,
                // Dummy stats
                attack: 100, hp: 100, defense: 100, speed: 100
            } as any,
            skills: [],
            deathRound,
            exSkillRounds: exRounds
        });

        const party: SimulationCharacter[] = [
            createChar('A', 'Transcendence'),
            createChar('B', 'Defender', 2),
            createChar('C', 'Supporter', undefined, [3]), // EX in Round 3
            createChar('D', 'Supporter', undefined, [3]), // EX in Round 3
            createChar('E', 'Attacker'),
            createChar('F', 'Supporter'),
            createChar('G', 'Transcendence'),
            createChar('H', 'Supporter', 3),
            createChar('I', 'Attacker', 6)
        ];

        // Run simulation for enough rounds to reach T20-T22
        // Assuming roughly 10 actions per round (9 chars + boss) initially? 
        // Let's run for 5 rounds.
        const results = simulateTurns(party, 5);

        // Find actions at Global Turn 20, 21, 22
        const t20 = results.find(a => a.globalTurn === 20);
        const t21 = results.find(a => a.globalTurn === 21);
        const t22 = results.find(a => a.globalTurn === 22);

        // Debug output
        console.log('T20 Actor:', t20?.actorName);
        console.log('T21 Actor:', t21?.actorName);
        console.log('T22 Actor:', t22?.actorName);

        // Expected:
        // T20: Transcendence A
        // T21: BOSS
        // T22: Supporter C (or whoever is next valid)

        // Note: Boss actions might be interleaved. 
        // User says: T20: Transcendence A, T21: BOSS, T22: Supporter C.

        expect(t20?.actorName).toBe('A');
        expect(t21?.actorName).toBe('Boss');
        expect(t22?.actorName).toBe('C');
    });
});
