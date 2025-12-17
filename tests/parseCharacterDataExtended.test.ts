// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseCharacterData } from '../src/logic/wikiParser';

const loadHtml = (filename: string) => {
    return fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');
};

describe('parseCharacterData - Extended Aggregation', () => {
    const monikaHtml = loadHtml('monika.html');

    it('should aggregate all stats correctly in parseCharacterData', () => {
        const charData = parseCharacterData(monikaHtml);
        const stats = charData.stats as { [key: string]: number };

        // Base Stats (from Table 1 Lv100):
        // HP: 6714
        // Support: 70 (parsed from "70%")

        // Calculation - Support:
        // Base: 70
        // Awakening: +9 -> 79
        // Bond: +2 (Max Level) -> 81
        // Flat Total = 81
        // Equipment: +40% (20+20) (支援力の追加は同一スケールなので加算処理となる）
        // Bond %: 0
        // Modifier Total = +40%
        // Final: 81 + 40 = 121
        expect(stats['Support']).toBe(121);

        // Calculation - HP:
        // Base: 6714
        // Awakening: +884 -> 7598
        // Bond: 0
        // Flat Total = 7598
        // Equipment: +10% (HPの場合は割合計算） -> 7598 * 0.1 = 759.8
        // Final: 7598 + 759.8 = 8357.8 -> Round to 8358
        expect(stats['Hp']).toBe(8358);
    });

    it('should aggregate stats correctly for Iria (Attacker)', () => {
        const iriaHtml = loadHtml('iria.html');
        const charData = parseCharacterData(iriaHtml);
        const stats = charData.stats as { [key: string]: number };

        // Calculation - Attack (Value Stat, Multiplicative):
        // Base: 508
        // Awakening: +69 -> 577
        // Bond: 0
        // Equipment: +10% -> 577 * 0.1 = 57.7
        // Final: 577 + 57.7 = 634.7 -> Round to 635
        expect(stats['Attack']).toBe(635);

        // Calculation - HP (Value Stat, Multiplicative):
        // Base: 9056
        // Awakening: +1190
        // Bond: +286
        // Flat Total: 9056 + 1190 + 286 = 10532
        // Equipment: +20% -> 10532 * 0.2 = 2106.4
        // Final: 10532 + 2106.4 = 12638.4 -> Round to 12638
        expect(stats['Hp']).toBe(12638);
    });
});
