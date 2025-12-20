
import { simulateTurns, type SimulationCharacter } from '../logic/turnSimulator';
import type { SkillData } from '../logic/wikiParser';
import { describe, test, expect } from 'vitest';

describe('Turn Simulator - EX Skill Timing', () => {
    // Helper to create character
    const createCharacter = (name: string, speed: number, exRounds: number[] = []): SimulationCharacter => ({
        name,
        role: 'Attacker',
        type: '攻撃型',
        attackRange: { row: 1, col: 1 },
        stats: { hp: 100, attack: 100, defense: 10, speed: speed } as any,
        skills: [],
        exSkillRounds: exRounds
    });

    const createNormalSkill = (name: string): SkillData => ({
        name,
        levels: [{
            level: '1',
            description: 'Normal Skill',
            effects: [{ attribute: 'Attack', value: 10, type: 'Buff', target: 'Self' }]
        }]
    });

    const createExSkill = (name: string): SkillData => ({
        name,
        levels: [{
            level: 'Ex',
            description: 'Ex Skill',
            effects: [{ attribute: 'Attack', value: 20, type: 'Buff', target: 'Self' }]
        }]
    });

    test('EX skills should activate in index order relative to normal turns', () => {
        // Character A: Fast, Normal Skill
        const charA = createCharacter('CharA', 200);
        charA.skills = [createNormalSkill('Normal A')];

        // Character B: Slow, EX Skill (Round 1) + Normal Skill
        const charB = createCharacter('CharB', 100, [1]);
        charB.skills = [createNormalSkill('Normal B'), createExSkill('Ex B')];

        const party = [charA, charB];
        const result = simulateTurns(party, 1);

        // Expected Order (New Logic):
        // 1. CharA (Index 0)
        // 2. Boss (Interrupt because Attacker acts)
        // 3. CharB (Index 1)

        expect(result.length).toBeGreaterThanOrEqual(3);

        const action1 = result[0];
        const action2 = result[1];
        const action3 = result[2];

        // 1. CharA acts (Normal A)
        expect(action1.actorName).toBe('CharA');

        // 2. Boss Acts (triggered by CharA's action)
        expect(action2.actorName).toBe('Boss');

        // 3. CharB acts (EX + Normal Merged)
        expect(action3.actorName).toBe('CharB');
        const charBState = action3.characterStates.find(c => c.name === 'CharB');

        const hasExB = charBState?.receivedSkills.some(s => s.name === 'Ex B');
        const hasNormalB = charBState?.receivedSkills.some(s => s.name === 'Normal B');
        expect(hasExB).toBe(true);
        expect(hasNormalB).toBe(true);
    });

    test('EX Support Buff should be active for subsequent SupportScaling calculations in Round 2 and persist to Round 3', () => {
        // Setup Supporter with EX Skill that buffs Support
        // Activate EX on Round 2
        const supporter = createCharacter('SupporterC', 200, [2]);
        supporter.role = 'Supporter';
        supporter.type = '支援型';
        supporter.stats = { hp: 1000, defense: 100, speed: 200, Support: 100 } as any;

        // Setup Attacker who will receive the buff
        const attacker = createCharacter('AttackerD', 100);
        attacker.role = 'Attacker';
        attacker.stats = { hp: 1000, attack: 100, defense: 100, speed: 100 } as any;

        const exBuffSkill: SkillData = {
            name: 'Support Boost (Ex)',
            levels: [{
                level: 'Ex',
                description: 'Boosts Support Power',
                effects: [{
                    attribute: 'Support',
                    value: 20, // +20 Support Power
                    type: 'Buff',
                    target: 'Self',
                    isStackable: true,
                    duration: 99
                }]
            }]
        };

        const scalingSkill: SkillData = {
            name: 'Scaling Buff',
            levels: [{
                level: '10',
                description: 'Buff based on Support',
                effects: [{
                    attribute: 'Attack',
                    value: 200, // 200% of Support Power
                    type: 'Buff',
                    target: 'AllAllies', // Apply to Attacker (and Self)
                    calculationType: 'SupportScaling',
                    scalingFactor: 'Support'
                }]
            }]
        };

        supporter.skills = [scalingSkill, exBuffSkill];
        attacker.skills = [];

        // Simulate 5 Rounds
        const result = simulateTurns([supporter, attacker], 5);

        // --- check all actions length ( (2+1[boss]) * 5 = 15) ---
        expect(result.length).toBe(15);

        // --- Round 1 Verification (No EX) ---
        // Supporter acts (Normal). Attacker acts.
        // Order: SupporterC -> AttackerD -> Boss (Supporter didn't trigger?) Wait, Supporter doesn't trigger boss per logic (allowsContinuous).
        // Actual Order R1: SupporterC (0) -> AttackerD (1) -> Boss (2)

        const r1ActionSupporter = result[0];
        expect(r1ActionSupporter.actorName).toBe('SupporterC');
        expect(r1ActionSupporter.round).toBe(1);

        const r1ActionAttacker = result[1];
        expect(r1ActionAttacker.actorName).toBe('AttackerD');
        // Check buff value on attacker
        const r1State = r1ActionAttacker.characterStates.find(c => c.name === 'AttackerD');
        const r1Buffs = r1State?.receivedSkills.filter(s => s.name === 'Scaling Buff') || [];
        expect(r1Buffs.length).toBeGreaterThan(0);
        const r1Buff = r1Buffs[r1Buffs.length - 1];
        const r1Effect = r1Buff.effects.find(e => e.attribute === 'Attack');
        expect(r1Effect?.actuatorSupportPower).toBe(100);
        expect(r1Effect?.value).toBe(200);

        // --- Round 2 Verification (With EX) ---
        // Supporter activates EX. This merges EX+Normal into one action.
        // Order R2: SupporterC (Priority R2) -> AttackerD -> Boss

        // Find start of Round 2.
        // R1 had 3 actions (Supporter, Attacker, Boss).
        // So R2 starts at index 3.
        const r2ActionSupporter = result[3];
        expect(r2ActionSupporter.actorName).toBe('SupporterC');
        expect(r2ActionSupporter.round).toBe(2);

        // Verify Merged Action: Should have EX skill AND Normal skill applied
        const r2SupporterState = r2ActionSupporter.characterStates.find(c => c.name === 'SupporterC');
        const hasExR2 = r2SupporterState?.receivedSkills.some(s => s.name === 'Support Boost (Ex)');
        const hasNormalR2 = r2SupporterState?.receivedSkills.some(s => s.name === 'Scaling Buff');
        expect(hasExR2).toBe(true);
        expect(hasNormalR2).toBe(true);

        const r2ActionAttacker = result[4];
        expect(r2ActionAttacker.actorName).toBe('AttackerD');

        // Check buff value on attacker
        const r2State = r2ActionAttacker.characterStates.find(c => c.name === 'AttackerD');
        const r2Buffs = r2State?.receivedSkills.filter(s => s.name === 'Scaling Buff') || [];
        const r2Buff = r2Buffs[r2Buffs.length - 1];
        const r2Effect = r2Buff.effects.find(e => e.attribute === 'Attack');

        // EX (+20 Support) applied first in the merged action. So scaling uses 120.
        expect(r2Effect?.actuatorSupportPower).toBe(120);
        expect(r2Effect?.value).toBe(240);

        // --- Round 3 Verification (With Persisted EX) ---
        // Supporter Normal (EX duration 99).
        // Order R3: SupporterC -> AttackerD -> Boss
        // R2 had 3 actions (Supporter, Attacker, Boss).
        // R3 starts at index 6.
        const r3ActionSupporter = result[6];
        expect(r3ActionSupporter.actorName).toBe('SupporterC');

        const r3ActionAttacker = result[7];
        expect(r3ActionAttacker.actorName).toBe('AttackerD');

        const r3State = r3ActionAttacker.characterStates.find(c => c.name === 'AttackerD');
        const r3Buffs = r3State?.receivedSkills.filter(s => s.name === 'Scaling Buff') || [];
        const r3Buff = r3Buffs[r3Buffs.length - 1];
        const r3Effect = r3Buff.effects.find(e => e.attribute === 'Attack');

        expect(r3Effect?.actuatorSupportPower).toBe(120);
        expect(r3Effect?.value).toBe(240);
    });
});
