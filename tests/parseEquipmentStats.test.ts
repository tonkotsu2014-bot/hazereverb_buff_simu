// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import fs from 'fs';
import path from 'path';
import { parseEquipmentStats } from '../src/logic/wikiParser';

const loadHtml = (filename: string) => {
    return fs.readFileSync(path.join(__dirname, 'data', filename), 'utf-8');
};

describe('parseEquipmentStats', () => {
    const monikaHtml = loadHtml('monika.html');
    const parser = new DOMParser();
    const monikaDoc = parser.parseFromString(monikaHtml, 'text/html');

    it('should parse Equipment stats correctly', () => {
        const stats = parseEquipmentStats(monikaDoc);
        // Expected:
        // Equip 1: Support 20%
        // Equip 2: HP 10%
        // Equip 3: Support 20%
        // Total: Support 40, Hp 10 (percentages)
        expect(stats['Support']).toBe(40);
        expect(stats['Hp']).toBe(10);
    });

    const iriaHtml = loadHtml('iria.html');
    const iriaDoc = parser.parseFromString(iriaHtml, 'text/html');

    it('should parse Equipment stats correctly for Iria', () => {
        const stats = parseEquipmentStats(iriaDoc);
        // Expected from Debug Output: Attack: 10, Hp: 20
        expect(stats['Attack']).toBe(10);
        expect(stats['Hp']).toBe(20);
    });
});
