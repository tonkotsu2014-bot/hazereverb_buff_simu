// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseAwakeningStats } from '../src/logic/wikiParser';

const loadHtml = (filename: string) => {
    return fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');
};

describe('parseAwakeningStats', () => {
    const monikaHtml = loadHtml('monika.html');
    const parser = new DOMParser();
    const monikaDoc = parser.parseFromString(monikaHtml, 'text/html');

    it('should parse Awakening stats correctly', () => {
        const stats = parseAwakeningStats(monikaDoc);
        // Expected: HP+884, Support+9
        expect(stats['Hp']).toBe(884);
        expect(stats['Support']).toBe(9);
    });

    const iriaHtml = loadHtml('iria.html');
    const iriaDoc = parser.parseFromString(iriaHtml, 'text/html');

    it('should parse Awakening stats correctly for Iria', () => {
        const stats = parseAwakeningStats(iriaDoc);
        // Expected from Debug Output: Hp: 1190, Attack: 69
        expect(stats['Hp']).toBe(1190);
        expect(stats['Attack']).toBe(69);
    });
});
