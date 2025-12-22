
import { describe, test, expect } from 'vitest';
import { simulateTurns, type SimulationCharacter } from '../logic/turnSimulator';
import type { SkillData } from '../logic/wikiParser';

describe('TurnSimulator - Active Level Selection', () => {
    const createMockSkill = (name: string, activeLevel?: string): SkillData => ({
        name,
        activeLevel,
        levels: [
            {
                level: '1',
                description: 'Level 1 Effect',
                effects: [
                    {
                        type: 'Buff',
                        attribute: 'Attack',
                        value: 10,
                        duration: 3,
                        calculationType: 'Fixed',
                        target: 'Self',
                        isStackable: true
                    }
                ]
            },
            {
                level: '5',
                description: 'Level 5 Effect',
                effects: [
                    {
                        type: 'Buff',
                        attribute: 'Attack',
                        value: 50,
                        duration: 3,
                        calculationType: 'Fixed',
                        target: 'Self',
                        isStackable: true
                    }
                ]
            }
        ]
    });

    test('should apply Level 1 effects when activeLevel is set to "1"', () => {
        const character: SimulationCharacter = {
            name: 'TestChar',
            skills: [createMockSkill('TestSkill', '1')],
            stats: { hp: '100', attack: '100', defense: '10', critRate: '0', critDamage: '0', speed: '10' }
        };

        const result = simulateTurns([character], 1);
        const charActions = result.filter(a => a.actorRole !== 'System');
        const action = charActions[0];

        // Find the self-buff on the character
        const charState = action.characterStates[0];
        const skill = charState.receivedSkills.find(s => s.name === 'TestSkill');

        expect(skill).toBeDefined();
        // Lv.1 gives 10
        expect(skill?.effects[0].value).toBe(10);
    });

    test('should apply Level 5 effects when activeLevel is set to "5"', () => {
        const character: SimulationCharacter = {
            name: 'TestChar',
            skills: [createMockSkill('TestSkill', '5')],
            stats: { hp: '100', attack: '100', defense: '10', critRate: '0', critDamage: '0', speed: '10' }
        };

        const result = simulateTurns([character], 1);
        const charActions = result.filter(a => a.actorRole !== 'System');
        const action = charActions[0];

        const charState = action.characterStates[0];
        const skill = charState.receivedSkills.find(s => s.name === 'TestSkill');

        expect(skill).toBeDefined();
        // Lv.5 gives 50
        expect(skill?.effects[0].value).toBe(50);
    });

    test('should default to highest level (Lv.5) when activeLevel is undefined', () => {
        const character: SimulationCharacter = {
            name: 'TestChar',
            skills: [createMockSkill('TestSkill', undefined)], // No active level
            stats: { hp: '100', attack: '100', defense: '10', critRate: '0', critDamage: '0', speed: '10' }
        };

        const result = simulateTurns([character], 1);
        const charActions = result.filter(a => a.actorRole !== 'System');
        const action = charActions[0];

        const charState = action.characterStates[0];
        const skill = charState.receivedSkills.find(s => s.name === 'TestSkill');

        expect(skill).toBeDefined();
        // Default logic usually picks highest available or follows fallbacks.
        // In our logic, it tries to find '10', then reduces to find max.
        // Here max is Lv.5
        expect(skill?.effects[0].value).toBe(50);
    });
});
