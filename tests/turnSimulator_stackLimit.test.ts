import { describe, test, expect } from 'vitest';
import { simulateTurns, SimulationCharacter } from '../src/logic/turnSimulator';
import { ParsedCharacterData } from '../src/logic/wikiParser';

describe('turnSimulator Stack Limit', () => {
    const dummyCharacter: SimulationCharacter = {
        name: 'Stacker',
        role: 'Attacker',
        attribute: 'red',
        weapon: 'sword',
        maxHp: '1000',
        stats: {
            Attack: 100,
            CritRate: 0.5,
            CritDamage: 1.5,
            Speed: 100
        },
        skills: [
            {
                name: 'Stacking Skill',
                cost: '3',
                range: '1',
                type: 'Active',
                levels: [
                    {
                        level: '10',
                        description: 'Stackable effect test',
                        effects: [
                            {
                                attribute: 'Attack',
                                value: 10,
                                type: 'Buff',
                                calculationType: 'Addition',
                                target: 'Self',
                                description: 'Increases Attack by 10%',
                                isStackable: true,
                                duration: 99 // Long duration to ensure they pile up
                            }
                        ]
                    }
                ],
                activeLevel: '10'
            }
        ],
        activeSkillLevel: '10'
    };

    test('should limit stackable skills to 5 stacks', () => {
        const party: (SimulationCharacter | null)[] = [dummyCharacter];
        // Simulate enough rounds to cast the skill > 5 times.
        // If speed is normal, character acts once per global turn approximately.
        // We'll simulate 10 rounds to be safe.
        const maxRounds = 10;
        const result = simulateTurns(party, maxRounds);

        // Analyze the state of the character in the later turns
        // We expect the 'Stacking Skill' effects to be present but capped at 5.

        // Let's check the state at the end of round 10.
        const lastAction = result[result.length - 1];
        const characterState = lastAction.characterStates[0];

        // Find all received effects that match our skill
        const stackEffects = characterState.receivedSkills.filter(s => s.name === 'Stacking Skill');

        // Check if count <= 5
        expect(stackEffects.length).toBeLessThanOrEqual(5);

        // If we simulated 10 rounds, we expect it to have reached 5
        // Assuming the character acts every round or frequently enough.
        // Let's count how many times they acted.
        const actionsCount = result.filter(a => a.actorName === 'Stacker').length;

        // If they acted > 5 times, stack count should be 5 (since duration is 99)
        if (actionsCount > 5) {
            expect(stackEffects.length).toBe(5);
        }

        console.log(`Actions: ${actionsCount}, Stacks: ${stackEffects.length}`);

        // Verify that the stacks are from the latest turns (FIFO check)
        // The startGlobalTurn of the remaining stacks should be the highest ones.
        const startTurns = stackEffects.map(s => s.startGlobalTurn).sort((a, b) => a - b);

        // If we have 5 stacks, and let's say repeated 10 times (global turns ~10, 20, ...),
        // we expect the earlier ones to be gone.
        // Just ensuring they are distinct and recent is good enough for basic check.
        // We can check if the smallest startTurn is > 1 (assuming first turn was 1).
        if (actionsCount > 6) {
            const firstActionTurn = result.find(a => a.actorName === 'Stacker')?.globalTurn;
            expect(startTurns[0]).toBeGreaterThan(firstActionTurn!);
        }
    });
});
