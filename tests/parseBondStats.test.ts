// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseBondStats } from '../src/logic/wikiParser';

const loadHtml = (filename: string) => {
    return fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');
};

describe('parseBondStats', () => {
    const monikaHtml = loadHtml('monika.html');
    const parser = new DOMParser();
    const monikaDoc = parser.parseFromString(monikaHtml, 'text/html');

    it('should parse Bond stats correctly', () => {
        const stats = parseBondStats(monikaDoc);
        // Expected:
        // Bond 2: Support +1
        // Bond 3: Support +2
        // Bond 4: Support +2
        // Bond 5: Support +2, Mobility +5%
        // Bond 5: Support +2, Mobility +5%
        // Total Flat: Support 2 (Max Level)
        // Total Percent: Mobility 5 (Max Level)
        expect(stats['Support']).toBe(2);
        expect(stats['Mobility_Percent']).toBe(5);
    });

    const iriaHtml = loadHtml('iria.html');
    const iriaDoc = parser.parseFromString(iriaHtml, 'text/html');

    it('should parse Bond stats correctly for Iria', () => {
        const stats = parseBondStats(iriaDoc);
        // Expected from Debug Output: Hp: 286, Armor_Percent: 5
        expect(stats['Hp']).toBe(286);
        expect(stats['Armor_Percent']).toBe(5);
    });
});
