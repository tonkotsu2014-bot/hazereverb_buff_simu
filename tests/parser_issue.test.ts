// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCharacterData } from '../src/logic/wikiParser';

describe('WikiParser Skill Level Issue', () => {
    it('should correctly parse skill levels preventing single numbers from being treated as description', () => {
        const htmlPath = path.resolve(__dirname, 'data/iria.html');
        const html = fs.readFileSync(htmlPath, 'utf-8');
        const data = parseCharacterData(html);

        // Skill 1 Check
        const skill1 = data.skills.find(s => s.name.includes('スキル1'));
        expect(skill1).toBeDefined();

        for (let i = 1; i <= 10; i++) {
            const levelStr = i.toString();
            const levelData = skill1?.levels.find(l => l.level === levelStr);
            expect(levelData, `Skill 1 Level ${levelStr} should exist`).toBeDefined();

            // Skill 1: Levels 1 and 4 have descriptions
            if (i === 1 || i === 4) {
                expect(levelData?.description).toBeTruthy();
            } else {
                expect(levelData?.description).toBeNull();
            }
        }

        // Skill 2 Check
        const skill2 = data.skills.find(s => s.name.includes('スキル2'));
        expect(skill2).toBeDefined();

        for (let i = 1; i <= 10; i++) {
            const levelStr = i.toString();
            const levelData = skill2?.levels.find(l => l.level === levelStr);
            expect(levelData, `Skill 2 Level ${levelStr} should exist`).toBeDefined();

            // Skill 2: Levels 1, 2, 5, 8 have descriptions
            const hasDesc = [1, 2, 5, 8].includes(i);

            if (hasDesc) {
                expect(levelData?.description, `Skill 2 Level ${i} should have description`).toBeTruthy();
            } else {
                expect(levelData?.description, `Skill 2 Level ${i} should be null`).toBeNull();
            }
        }
    });
});
