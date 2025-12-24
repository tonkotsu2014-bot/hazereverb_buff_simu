
import { describe, test, expect } from 'vitest';
import { JSDOM } from 'jsdom';
import { parseSkills } from '../src/logic/wikiParser';

describe('WikiParser - Skill Level Filtering', () => {
    test('should exclude skill levels with undefined or empty descriptions', () => {
        const html = `
            <div id="wikibody">
                <table>
                    <thead>
                        <tr><th>スキル A</th></tr>
                    </thead>
                    <tbody>
                        <tr><td>1</td><td>Valid Description</td></tr>
                        <tr><td>2</td><td></td></tr>
                        <tr><td>3</td><td>   </td></tr>
                        <tr><td>4</td></tr> <!-- Single cell, results in description: null currently -->
                    </tbody>
                </table>
            </div>
        `;
        const dom = new JSDOM(html);
        const doc = dom.window.document;

        const skills = parseSkills(doc);

        expect(skills.length).toBe(1);
        const skill = skills[0];
        expect(skill.name).toBe('スキル A');

        // Should only have level 1
        // Should have Level 1 (Valid) and Level 4 (Single cell, Null description)
        expect(skill.levels.length).toBe(1);

        expect(skill.levels[0].level).toBe('1');
        expect(skill.levels[0].description).toBe('ValidDescription');
    });
});
