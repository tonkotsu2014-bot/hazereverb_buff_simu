import { describe, test, expect } from 'vitest';
import { getCharacterBaseStat, calculateDisplayValue, calculateCombinedCritDamage, calculateGraphData } from '../src/components/Simulation/SimulationResultGraph';
import type { ParsedCharacterData } from '../src/logic/wikiParser';

describe('Graph Calculation Logic', () => {

    describe('getCharacterBaseStat', () => {
        const mockChar: ParsedCharacterData = {
            name: 'TestChar',
            skills: [],
            stats: {
                Hp: 1000,
                Attack: 500,
                Armor: 100,
                CritRate: 15,
                CritDamage: 150,
                Mobility: 20
            }
        };

        const mockCharNumeric: ParsedCharacterData = {
            name: 'NumericChar',
            skills: [],
            stats: {
                Hp: 2000,
                Support: 120, // Special case
                Armor: 200,
                CritRate: 20,
                CritDamage: 180,
                Mobility: 30
            }
        };

        test('should parse string stats correctly', () => {
            expect(getCharacterBaseStat(mockChar, 'Hp')).toBe(1000);
            expect(getCharacterBaseStat(mockChar, 'Attack')).toBe(500);
            expect(getCharacterBaseStat(mockChar, 'CritRate')).toBe(15);
            expect(getCharacterBaseStat(mockChar, 'CritDamage')).toBe(150);
        });

        test('should handle numeric stats correctly', () => {
            expect(getCharacterBaseStat(mockCharNumeric, 'Hp')).toBe(2000);
            expect(getCharacterBaseStat(mockCharNumeric, 'Support')).toBe(120);
        });

        test('should return 0 for missing attributes', () => {
            expect(getCharacterBaseStat(mockChar, 'NonExistent')).toBe(0);
        });

        test('should return 0 for undefined character', () => {
            expect(getCharacterBaseStat(undefined, 'Hp')).toBe(0);
        });
    });

    describe('calculateDisplayValue', () => {
        test('should NOT add base stats for Attack', () => {
            expect(calculateDisplayValue('Attack', 100, 50)).toBe(50);
        });

        test('should NOT add base stats for Hp', () => {
            expect(calculateDisplayValue('Hp', 1000, 200)).toBe(200);
        });

        test('should add base stats for CritRate', () => {
            expect(calculateDisplayValue('CritRate', 15, 10)).toBe(25);
        });

        test('should add base stats for Defense', () => {
            expect(calculateDisplayValue('Defense', 100, 20)).toBe(120);
        });

        test('should add base stats for Support', () => {
            expect(calculateDisplayValue('Support', 100, 20)).toBe(120);
        });
    });

    describe('calculateCombinedCritDamage', () => {
        test('should sum base, buff, and hyper crit', () => {
            expect(calculateCombinedCritDamage(150, 20, 30)).toBe(200);
        });

        test('should handle zeros', () => {
            expect(calculateCombinedCritDamage(150, 0, 0)).toBe(150);
            expect(calculateCombinedCritDamage(0, 20, 0)).toBe(20);
        });
    });

    describe('calculateGraphData', () => {


        const mockParty = [
            {
                id: 'char1',
                name: 'TestChar',
                skills: [],
                stats: {
                    Hp: 1000,
                    Attack: 500,
                    Armor: 100, // Armor
                    CritRate: 15,
                    CritDamage: 150,
                    Mobility: 20
                }
            }
        ];

        const mockSimulationResults: any[] = [
            {
                globalTurn: 1,
                round: 1,
                actorName: 'TestChar',
                actorIndex: 0,
                characterStates: [
                    {
                        receivedSkills: [
                            {
                                effects: [
                                    { attribute: 'Attack', type: 'Buff', value: 0.5 }, // 50% buff
                                    { attribute: 'CritRate', type: 'Buff', value: 20 }, // +20% flat
                                ]
                            }
                        ]
                    }
                ]
            }
        ];

        test('should return empty if no character selected', () => {
            const result = calculateGraphData(mockSimulationResults, null, mockParty);
            expect(result.chartData).toEqual([]);
            expect(result.activeAttributes).toEqual([]);
        });

        test('should return correct graph data structure', () => {
            const result = calculateGraphData(mockSimulationResults, 'char1', mockParty);

            expect(result.chartData).toHaveLength(1);
            const dataPoint = result.chartData[0];

            expect(dataPoint.name).toBe('1');
            expect(dataPoint.actor).toBe('TestChar');

            // Attack: Base 500. Logic says Attack only shows Buff value?
            // Let's check logic: shouldAddBaseStats('Attack') is false. So it returns buff value.
            // Buff value is 0.5. Wait, calculateDisplayValue returns buffValue if !shouldAddBaseStats.
            // Ah, line 101: if (shouldAddBaseStats) base+buff else buff.
            // So for Attack it should be 0.5.
            expect(dataPoint.Attack).toBe(0.5);

            // Defense: Base 100. Buff 0. Should be 100.
            expect(dataPoint.Defense).toBe(100);

            // CritRate: Base 15. Buff 20. Total 35.
            expect(dataPoint.CritRate).toBe(35);

            // Active attributes should include Attack and CritRate
            expect(result.activeAttributes).toContain('Attack');
            expect(result.activeAttributes).toContain('CritRate');
        });

        test('should identify action turns for highlighting', () => {
            const multiTurnResults: any[] = [
                {
                    globalTurn: 1,
                    round: 1,
                    actorName: 'TestChar',
                    actorIndex: 0,
                    characterStates: [],
                    name: '1'
                },
                {
                    globalTurn: 2,
                    round: 1,
                    actorName: 'AnotherChar',
                    actorIndex: 1,
                    characterStates: [],
                    name: '2'
                },
                {
                    globalTurn: 3,
                    round: 2,
                    actorName: 'TestChar',
                    actorIndex: 0,
                    characterStates: [],
                    name: '3'
                }
            ];

            const result = calculateGraphData(multiTurnResults, 'char1', mockParty);

            // Should contain '1' and '3' but not '2'
            expect(result.actionTurns).toContain('1');
            expect(result.actionTurns).toContain('3');
            expect(result.actionTurns).not.toContain('2');
            expect(result.actionTurns).toHaveLength(2);
        });
    });

});
