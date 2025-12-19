
import { simulateTurns, type SimulationCharacter } from '../logic/turnSimulator';
import type { SkillData } from '../logic/wikiParser';
import { describe, test, expect } from 'vitest';

describe('Turn Simulator - Support Power Data', () => {
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

    test('SupportScaling effect includes Actuator Support Power', () => {
        const supporter = createSupporter('SupporterA', 200);

        const skillEffects = [
            {
                attribute: 'Attack',
                value: 100,
                type: 'Buff',
                target: 'Self',
                calculationType: 'SupportScaling',
                scalingFactor: '支援力'
            }
        ];

        supporter.skills = [createSkill('Scaling Skill', skillEffects)];

        const result = simulateTurns([supporter], 1);
        const action = result[0];
        const state = action.characterStates[0];

        const received = state.receivedSkills.find(s => s.name === 'Scaling Skill');
        expect(received).toBeDefined();

        const attackBuff = received?.effects.find(e => e.attribute === 'Attack');
        expect(attackBuff).toBeDefined();

        // This is what we want to implement:
        expect(attackBuff?.actuatorSupportPower).toBe(200);
    });
});
