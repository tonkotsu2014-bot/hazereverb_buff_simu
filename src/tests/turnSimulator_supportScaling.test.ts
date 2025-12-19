import { simulateTurns, SimulationCharacter } from '../logic/turnSimulator';
import { SkillData } from '../logic/wikiParser';
import { describe, test, expect } from 'vitest';

describe('Turn Simulator - Support Power Scaling', () => {
    // 1. Setup Mock Character w/ Support Stat
    const createSupporter = (name: string, supportVal: number): SimulationCharacter => ({
        name,
        role: 'Supporter',
        type: '支援型',
        attackRange: { row: 1, col: 1 },
        stats: { hp: 100, attack: 100, defense: 10, speed: 10, Support: supportVal } as any,
        skills: []
    });

    const createSkill = (name: string, effects: any[]): SkillData => ({
        name,
        levels: [{
            level: '10',
            description: 'Test',
            effects: effects
        }]
    });

    test('SupportScaling uses Base Support + Active Support Buffs', () => {
        // Supporter has Base 100 Support
        const supporter = createSupporter('SupporterA', 100);

        // Skill A: Self Support Up 50 (value=50, type=Buff, attribute=Support)
        // Then: Apply SupportScaling Buff to Ally (value=200 -> 200% of Support)

        // Expected Logic:
        // 1. Self Support Up applies. Support = 100 + 50 = 150.
        // 2. Scaling: 200% of 150 = 300.
        // Result: Ally receives Attack Up of 300.

        const skillEffects = [
            {
                attribute: 'Support',
                value: 50,
                type: 'Buff',
                target: 'Self',
                isStackable: true
            },
            {
                attribute: 'Attack',
                value: 200, // 200% Scaling
                type: 'Buff',
                target: 'AllAllies', // Apply to self for easy checking
                calculationType: 'SupportScaling',
                isStackable: true
            }
        ];

        supporter.skills = [createSkill('Scaling Skill', skillEffects)];

        const result = simulateTurns([supporter], 1);
        const action = result[0];
        const state = action.characterStates[0];

        // Check Received Skills
        const received = state.receivedSkills.find(s => s.name === 'Scaling Skill');
        expect(received).toBeDefined();

        // Effect 0: Support Up 50
        const supportBuff = received?.effects.find(e => e.attribute === 'Support');
        expect(supportBuff?.value).toBe(50);

        // Effect 1: Scaling Attack Up
        // Should be 300
        const attackBuff = received?.effects.find(e => e.attribute === 'Attack');
        expect(attackBuff?.value).toBe(300);
    });

    test('SupportScaling uses External Support Buffs', () => {
        // Supporter A: Base 100.
        // Supporter B: Buffs Supporter A with +50 Support.
        // Supporter A acts 2nd: Uses Scaling Skill (200%).
        // Expected: (100 + 50) * 200% = 300.

        const supporterA = createSupporter('SupporterA', 100);
        const supporterB = createSupporter('SupporterB', 100);

        // B's Skill: Target All Allies, Support Up 50
        supporterB.skills = [createSkill('Buff Support', [{
            attribute: 'Support',
            value: 50,
            type: 'Buff',
            target: 'AllAllies',
            isStackable: true
        }])];

        // A's Skill: Scaling Attack 200%
        supporterA.skills = [createSkill('Scaling Attack', [{
            attribute: 'Attack',
            value: 200,
            type: 'Buff',
            target: 'Self',
            calculationType: 'SupportScaling',
            isStackable: true
        }])];

        // Order: B then A
        const result = simulateTurns([supporterB, supporterA], 1);

        // Check A's state (Index 1) in A's action (Round 1, Turn 2)
        // Result has actions.
        // Action 1: B acts. A receives Buff.
        // Action 2: A acts.

        const actionA = result.find(a => a.actorName === 'SupporterA');
        expect(actionA).toBeDefined();

        const stateA = actionA?.characterStates[1]; // A is at index 1

        // Check received skills for A
        // Should have 'Buff Support' and 'Scaling Attack'

        const buffSkill = stateA?.receivedSkills.find(s => s.name === 'Buff Support');
        expect(buffSkill).toBeDefined(); // +50 Support

        const scalingSkill = stateA?.receivedSkills.find(s => s.name === 'Scaling Attack');
        expect(scalingSkill).toBeDefined();

        const attackBuff = scalingSkill?.effects.find(e => e.attribute === 'Attack');
        // (100 Base + 50 Buff) * 200% = 300
        expect(attackBuff?.value).toBe(300);
    });
});
