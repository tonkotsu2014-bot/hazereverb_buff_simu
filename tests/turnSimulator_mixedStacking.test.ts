
import { describe, test, expect } from 'vitest';
import { simulateTurns, SimulationCharacter } from '../src/logic/turnSimulator';

describe('turnSimulator Mixed Stacking', () => {
    const mixedChar: SimulationCharacter = {
        name: 'HybridStacker',
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
                name: 'Mixed Skill',
                levels: [
                    {
                        level: '10',
                        description: 'Mixed effects',
                        effects: [
                            {
                                attribute: 'Mobility',
                                value: 30,
                                type: 'Debuff',
                                target: 'Self',
                                isStackable: true,
                                duration: -1
                            },
                            {
                                attribute: 'CritRate',
                                value: 20,
                                type: 'Buff',
                                target: 'Self',
                                isStackable: false,
                                duration: 9
                            }
                        ]
                    }
                ],
                activeLevel: '10'
            }
        ],
        activeSkillLevel: '10'
    };

    test('should stack stackable effects but not non-stackable ones from the same skill', () => {
        const party: (SimulationCharacter | null)[] = [mixedChar];
        // Simulate enough rounds to trigger the skill multiple times
        const maxRounds = 5;
        const result = simulateTurns(party, maxRounds);

        const lastAction = result[result.length - 1];
        const charState = lastAction.characterStates[0];

        // Find skills
        const skills = charState.receivedSkills.filter(s => s.name === 'Mixed Skill');

        // We expect multiple instances of the skill to be present because one effect IS stackable.
        // If the system was purely non-stackable, we'd have 1.
        // If purely stackable, we'd have X.
        // But the key is inspecting the EFFECTS within those skills.

        // Current logic might remove old skills entirely if "Overwrite" happens, or keep all if "Stack" happens.
        // The requirement is:
        // Effect 1 (Mobility): Should be present in ALL instances.
        // Effect 2 (CritRate): Should ONLY be present in the LATEST instance.

        expect(skills.length).toBeGreaterThan(1); // Assuming it activated multiple times

        let mobilityCount = 0;
        let critRateCount = 0;

        skills.forEach(skill => {
            skill.effects.forEach(e => {
                if (e.attribute === 'Mobility') mobilityCount++;
                if (e.attribute === 'CritRate') critRateCount++;
            });
        });

        console.log(`Mobility Count: ${mobilityCount}, CritRate Count: ${critRateCount}, Instances: ${skills.length}`);

        // Mobility is stackable -> should match number of skill instances
        expect(mobilityCount).toBe(skills.length);

        // CritRate is NOT stackable -> should be exactly 1 (only the latest)
        expect(critRateCount).toBe(1);
    });
});
