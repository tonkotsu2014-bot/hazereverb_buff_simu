import { describe, test, expect } from 'vitest';
import { getCharacterBaseStat, calculateDisplayValue, calculateCombinedCritDamage } from '../src/components/Simulation/SimulationResultGraph';
import type { ParsedCharacterData } from '../src/logic/wikiParser';

describe('Graph Calculation Logic', () => {

    describe('getCharacterBaseStat', () => {
        const mockChar: ParsedCharacterData = {
            name: 'TestChar',
            skills: [],
            stats: {
                hp: '1000',
                attack: '500',
                defense: '100',
                critRate: '15%',
                critDamage: '150%',
                speed: '20'
            }
        };

        const mockCharNumeric: ParsedCharacterData = {
            name: 'NumericChar',
            skills: [],
            stats: {
                hp: 2000,
                Support: 120, // Special case
                defense: 200,
                critRate: 20,
                critDamage: 180,
                speed: 30
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

});
