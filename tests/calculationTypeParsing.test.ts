// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { determineCalculationType } from '../src/logic/wikiParser';

describe('wikiParser - Calculation Type Determination (determineCalculationType)', () => {
    it('should return "Fixed" if scalingFactor is undefined or empty', () => {
        expect(determineCalculationType(undefined)).toEqual({ calculationType: 'Fixed', scalingFactor: undefined });
        expect(determineCalculationType('')).toEqual({ calculationType: 'Fixed', scalingFactor: undefined });
    });

    it('should return "SupportScaling" if scalingFactor includes "支援力"', () => {
        const factor = "支援力";
        expect(determineCalculationType(factor)).toEqual({ calculationType: 'SupportScaling', scalingFactor: undefined });
    });

    it('should return "SupportScaling" if scalingFactor includes "支援力" with other text', () => {
        const factor = "自身の支援力";
        expect(determineCalculationType(factor)).toEqual({ calculationType: 'SupportScaling', scalingFactor: undefined });
    });

    it('should return "Fixed" for any other scalingFactor (per user request)', () => {
        const factor = "攻撃力";
        expect(determineCalculationType(factor)).toEqual({ calculationType: 'Fixed', scalingFactor: factor });
    });

    it('should return "Fixed" for scalingFactor "防御力"', () => {
        const factor = "防御力";
        expect(determineCalculationType(factor)).toEqual({ calculationType: 'Fixed', scalingFactor: factor });
    });
});
