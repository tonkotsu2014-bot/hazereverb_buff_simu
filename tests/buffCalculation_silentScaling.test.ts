
import { describe, test, expect } from 'vitest';
import { calculateMaxBuffs } from '../src/logic/buffCalculation';
import type { ParsedCharacterData } from '../src/logic/wikiParser';

describe('buffCalculation Silent Scaling', () => {
    const mockCharacter: ParsedCharacterData = {
        name: 'SilentUser',
        role: 'Attacker',
        stats: {
            Attack: 1000,
            CritRate: 0,
            CritDamage: 150
        },
        skills: [
            {
                name: 'SilentBuffSkill',
                source: 'Test',
                levels: [
                    {
                        level: '10',
                        description: 'Gains Silent',
                        effects: [
                            {
                                type: 'Buff',
                                attribute: 'Silent',
                                value: 1,
                                target: 'Self',
                                isStackable: true
                            }
                        ]
                    }
                ]
            },
            {
                name: 'SilentAttackSkill',
                source: 'Test',
                levels: [
                    {
                        level: '10',
                        description: 'Attacks based on Silent count',
                        effects: [
                            {
                                type: 'Buff', // It accumulates to attackIncreasePercent if attribute is Attack
                                attribute: 'Attack',
                                value: 10, // Base value 10%
                                target: 'Self',
                                calculationType: 'SilentScaling'
                            }
                        ]
                    }
                ]
            }
        ]
    };

    test('should calculate SilentScaling based on stack count', () => {
        // 3 Stacks of SilentBuffSkill
        // Silent Count = 3 * 1 = 3.
        // SilentAttackSkill Value = 10 * 3 = 30.
        // Total Attack Increase = 30.

        const stackCounts = {
            'SilentBuffSkill': 3
        };

        const activeSkillLevels = {
            'SilentUser': '10'
        };

        const result = calculateMaxBuffs(
            mockCharacter,
            [], // No supporters
            stackCounts,
            {},
            activeSkillLevels
        );

        // We assume 'Attack' attribute with SilentScaling accumulates 'value * silentCount' into attackIncreasePercent.
        // Base Value 10. Silent Count 3. Result 30.
        expect(result.attackIncreasePercent).toBe(30);
    });

    test('should return 0 if no Silent buffs', () => {
        const stackCounts = {
            'SilentBuffSkill': 0
        };

        const activeSkillLevels = {
            'SilentUser': '10'
        };

        const result = calculateMaxBuffs(
            mockCharacter,
            [],
            stackCounts,
            {},
            activeSkillLevels
        );

        expect(result.attackIncreasePercent).toBe(0);
    });
});
