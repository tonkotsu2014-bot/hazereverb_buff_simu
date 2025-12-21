
import { describe, test, expect } from 'vitest';
import { simulateTurns, SimulationCharacter } from '../src/logic/turnSimulator';

describe('turnSimulator Permanent Effects', () => {
    const permChar: SimulationCharacter = {
        name: 'Eternal',
        role: 'Supporter',
        attribute: 'blue',
        weapon: 'staff',
        maxHp: '1000',
        stats: {
            Attack: 100,
            CritRate: 0.5,
            CritDamage: 1.5,
            Speed: 100,
            Support: 100
        },
        skills: [
            {
                name: 'Permanent Buff',
                cost: '3',
                range: '1',
                type: 'Active',
                levels: [
                    {
                        level: '10',
                        description: 'Forever buff',
                        effects: [
                            {
                                attribute: 'Attack',
                                value: 50,
                                type: 'Buff',
                                calculationType: 'Addition',
                                target: 'Self',
                                description: 'Increases Attack by 50% forever',
                                duration: -1
                            }
                        ]
                    }
                ],
                activeLevel: '10'
            }
        ],
        activeSkillLevel: '10'
    };

    test('should keep duration -1 effects active indefinitely', () => {
        const party: (SimulationCharacter | null)[] = [permChar];
        const maxRounds = 20; // Simulate long enough
        const result = simulateTurns(party, maxRounds);

        // Check the state at the last round
        const lastAction = result[result.length - 1];
        const charState = lastAction.characterStates[0];

        const permEffects = charState.receivedSkills.filter(s => s.name === 'Permanent Buff');

        // Should be active
        expect(permEffects.length).toBeGreaterThan(0);

        // Check remainingTurn
        const effect = permEffects[0].effects[0];
        // Based on implementation, remainingTurn might be -1 or just stay available.
        // My implementation sets it to -1.
        expect(effect.remainingTurn).toBe(-1);
    });
});
