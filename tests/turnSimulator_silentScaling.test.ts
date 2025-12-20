
import { describe, test, expect } from 'vitest';
import { simulateTurns, SimulationCharacter } from '../src/logic/turnSimulator';

describe('turnSimulator Silent Scaling', () => {
    const iliaChar: SimulationCharacter = {
        name: 'Ilia',
        role: 'Attacker',
        attribute: 'red',
        weapon: 'sword',
        maxHp: '1000',
        stats: {
            Attack: 100
        },
        skills: [
            {
                name: 'Grant Silent',
                levels: [
                    {
                        level: '10',
                        description: 'Grant Silent',
                        effects: [
                            {
                                attribute: 'Silent',
                                value: 1,
                                type: 'Buff',
                                target: 'Self',
                                isStackable: true,
                                duration: -1
                            }
                        ]
                    }
                ],
                activeLevel: '10'
            },
            {
                name: 'Silent Nuke',
                levels: [
                    {
                        level: '10',
                        description: 'Silent Scaling Damage',
                        effects: [
                            {
                                attribute: 'Damage',
                                value: 100, // Base value per Silent
                                type: 'Butt', // Typo in type? Assuming 'Buff' or just value holder. 'Damage' attribute usually not aggregated in chart but...
                                // Wait, the graph/table aggregates effects.
                                // Let's use 'Attack' to verify value easily in results.
                                attribute: 'Attack',
                                calculationType: 'SilentScaling',
                                target: 'Self',
                                duration: 1
                            }
                        ]
                    }
                ],
                activeLevel: '10'
            }
        ],
        activeSkillLevel: '10'
    };

    test('should scale effect value based on Silent buff count', () => {
        // We need to simulate:
        // Round 1: Grant Silent (Count 1)
        // Round 2: Grant Silent (Count 2)
        // Round 3: Grant Silent (Count 3)
        // Round 4: Silent Nuke -> Should have value 3 * 100 = 300

        // We can force skill usage order by defining a party with identical chars but simpler to just 
        // define a character with specific skills and simulate enough turns?
        // But simulateTurns iterates skills in order of definition usually?
        // Actually executeTurn applies ALL skills of the character.

        // To construct the scenario where Silent accumulates *before* the Nuke:
        // Note: All skills trigger every turn in current logic unless restricted.
        // So in Round 1, both "Grant Silent" and "Silent Nuke" will fire.
        // "Grant Silent" adds 1 stack.
        // "Silent Nuke" fires. (Count might be 0 or 1 depending on processing order).

        // To precisely control count:
        // We can look at the result of Round 3 or 4.

        // Round 1:
        // - Grant Silent (Stack becomes 1)
        // - Silent Nuke (Calculates based on 1? Or 0 if Nuke processed before Grant?)

        // Round 2:
        // - Grant Silent (Stack becomes 2)
        // - Silent Nuke (Calculates based on 2)

        // We want to verify the scaling.

        const party = [iliaChar];
        const result = simulateTurns(party, 3);

        // Check Round 3 Nuke result
        const r3Action = result.find(a => a.round === 3 && a.actorName === 'Ilia');
        expect(r3Action).toBeDefined();

        const r3State = r3Action!.characterStates[0];
        const nukeSkill = r3State.receivedSkills.find(s => s.name === 'Silent Nuke');
        expect(nukeSkill).toBeDefined();

        // In Round 3:
        // Start of R3: Has 2 stacks? (R1 gave 1, R2 gave 1).
        // During R3 execution: "Grant Silent" fires again -> 3 stacks.
        // "Silent Nuke" fires.

        // Order in 'skills' array determines execution order in 'simulateTurns'.
        // 'Grant Silent' is first index [0]. 'Silent Nuke' is second [1].
        // So R3 Grant Silent adds a stack => Total 3.
        // Then Silent Nuke fires => Should perceive 3 stacks.
        // Expected Value = 3 * 100 = 300.

        const nukeEffect = nukeSkill!.effects.find(e => e.attribute === 'Attack');
        expect(nukeEffect).toBeDefined();

        // Current logic lacks SilentScaling, so this should fail (likely value 100 or 0).
        // If calculationType 'SilentScaling' is unknown, it falls through?
        // Depending on implementation, might stay 100.

        // Check Silent Count
        const silentSkills = r3State.receivedSkills.filter(s => s.name === 'Grant Silent');
        // 'Grant Silent' accumulates because duration -1 and stackable.
        // Wait, how many instances?
        // Per-effect stacking logic:
        // 'Silent' effect is stackable: true.
        // So we expect 3 instances of 'Grant Silent' skill (one from each round).
        // Each has value 1.

        // Actually, verify Silent count first
        let silentCount = 0;
        r3State.receivedSkills.forEach(s => {
            s.effects.forEach(e => {
                if (e.attribute === 'Silent') silentCount += e.value;
            });
        });
        expect(silentCount).toBe(3);

        // Now verify Scaling
        expect(nukeEffect!.value).toBe(300);
    });
});
