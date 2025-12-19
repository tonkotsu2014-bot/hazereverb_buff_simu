import { simulateTurns } from '../logic/turnSimulator';
import type { SimulationCharacter, ReceivedSkillEffect } from '../logic/turnSimulator';
import type { SkillData } from '../logic/wikiParser';
import { describe, test, expect } from 'vitest';

describe('Turn Simulator - EX Skill Activation', () => {
    // Mock Characters
    const createCharacter = (name: string, role: string, skills: SkillData[], exRounds: number[] = []): SimulationCharacter => ({
        name,
        type: 'Type',
        role,
        attackRange: { row: 1, col: 1 },
        skills: skills,
        stats: { hp: 100, attack: 100, defense: 10, speed: 10 },
        exSkillRounds: exRounds
    });

    const createSkill = (name: string, level: string, effectValue: number): SkillData => ({
        name,
        levels: [
            {
                level,
                description: 'Test Skill',
                effects: [
                    {
                        attribute: 'Attack',
                        value: effectValue,
                        type: 'Buff',
                        target: 'Self',
                        isStackable: true
                    }
                ]
            }
        ]
    });

    test('EX skill activates only on specified rounds', () => {
        // Character with an EX skill (level='Ex') and a normal skill (level='10')
        // We simulate the EX skill being present.
        const exSkill: SkillData = {
            name: 'Divine Power (Ex)',
            levels: [
                {
                    level: 'Ex', // Must be 'Ex' (case insensitive in our logic, but let's use Ex)
                    description: 'Ex Effect',
                    effects: [
                        {
                            attribute: 'Attack',
                            value: 50, // 50% Attack Buff
                            type: 'Buff',
                            target: 'Self',
                            isStackable: true
                        }
                    ]
                }
            ]
        };

        const char = createCharacter('Hero', 'Attacker', [exSkill], [2, 4]); // Activate on Round 2 and 4

        // Simulate 5 rounds
        const result = simulateTurns([char], 5);

        const actions = result.filter(a => a.actorName === 'Hero');

        // Round 1: No Ex Skill
        const r1 = result.find(a => a.round === 1 && a.actorName === 'Hero');
        const r1Skills = r1?.characterStates[0].receivedSkills || [];
        expect(r1Skills.find(s => s.name === 'Divine Power (Ex)')).toBeUndefined();

        // Round 2: Ex Skill Activated
        const r2 = result.find(a => a.round === 2 && a.actorName === 'Hero');
        const r2Skills = r2?.characterStates[0].receivedSkills || [];
        expect(r2Skills.find(s => s.name === 'Divine Power (Ex)')).toBeDefined();

        // Round 3: No Ex Skill (unless it persists? Our simulator logic re-adds skills every turn if valid. Duration isn't tracked yet?)
        // Wait, current simulator logic relies on adding skills *each turn* of their action.
        // If the skill has duration, it's usually handled by `ReceivedSkill` persistence?
        // Actually `turnSimulator` treats buffs as "received this turn".
        // The accumulation logic: `accumulateBuffs` from `buffCalculation` handles persistence?
        // No, `turnSimulator` currently seems to just record "what skills were used/received THIS turn".
        // Ah, `characterStates` has `receivedSkills`.
        // If the skill is added on Round 2, does it stay for Round 3?
        // The `simulateTurns` function re-evaluates skills every turn.
        // It does NOT clear `receivedSkills` from previous turns explicitly?
        // Let's check `simulateTurns` implementation.
        // `accumulatedSkills` is passed into `getSnapshot`.
        // `accumulatedSkills` is initialized outside the round loop? 
        // No, `accumulatedSkills` (ReceivedSkill[][]) is state.
        // In `simulateTurns`: `const accumulatedSkills: ReceivedSkill[][] = party.map(() => []);`
        // It persists across rounds.
        // So if added in Round 2, it is there in Round 3.

        // Wait, if it persists, then my logic "only apply if current round matches" means:
        // If match, ADD it. If not match, DON'T ADD.
        // But if it was already added in Round 2, does it duplicate? 
        // Logic checks `alreadyHasSameName` (unless stackable).
        // My EX skill test uses `isStackable: true`.
        // If `isStackable: false`, it would be added once and stay.

        // Let's test non-stackable EX skill behavior.
        // If Round 2 adds it. Round 3 doesn't add it. Result: Round 3 still has it (from Round 2).

        // But the user request is "EX Skill Activation". Usually EX skills are instantaneous or have duration.
        // If `turnSimulator` just accumulates everything forever, it's a "Buff buildup" simulator, not a full battle state with duration.
        // Assuming this behavior is expected for now.

        // My test: 'Divine Power' is stackable.
        // Round 1: 0 stacks
        // Round 2: Adds 1 stack. Total 1.
        // Round 3: Not in exRounds. Doesn't add new stack. Total 1.
        // Round 4: In exRounds. Adds 1 stack. Total 2.

        const r3 = result.find(a => a.round === 3 && a.actorName === 'Hero');
        const r3Skills = r3?.characterStates[0].receivedSkills || [];
        const r3Ex = r3Skills.filter(s => s.name === 'Divine Power (Ex)');
        expect(r3Ex.length).toBe(1); // Persisted from Round 2

        const r4 = result.find(a => a.round === 4 && a.actorName === 'Hero');
        const r4Skills = r4?.characterStates[0].receivedSkills || [];
        const r4Ex = r4Skills.filter(s => s.name === 'Divine Power (Ex)');
        expect(r4Ex.length).toBe(2); // Added again
    });
});
