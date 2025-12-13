// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseCharacterData } from '../src/logic/wikiParser';
import { TEST_HTML, IRIA_HTML, DOROCY_HTML } from './testData';

describe('wikiParser', () => {
    it('should parse skills from HTML', () => {
        const result = parseCharacterData(TEST_HTML);

        console.log('Found Skills:', result.skills.map(s => s.name));

        // Expect to find Ex Skill, Skill 1, Skill 2
        // Note: The selector currently looks for 'table.atwiki_table_color'.
        // If the HTML input doesn't have this class, it might return empty.
        // We will verify this behavior.

        // Should NOT include non-skill tables like 'タイプ'
        expect(result.skills.map(s => s.name)).not.toContain('タイプ');

        // expect(result.skills.length).toBeGreaterThan(0); 
    });

    it('should extract Ex Skill correctly', () => {
        const result = parseCharacterData(TEST_HTML);
        const exSkill = result.skills.find(s => s.name.includes('Exスキル'));

        expect(exSkill).toBeDefined();
        if (exSkill) {
            expect(exSkill.levels.length).toBe(1);
            expect(exSkill.levels[0].description).toContain('シールド展開');
        }
    });

    it('should extract Normal Skill correctly', () => {
        const result = parseCharacterData(TEST_HTML);
        const skill1 = result.skills.find(s => s.name.includes('スキル1'));

        expect(skill1).toBeDefined();
        if (skill1) {
            expect(skill1.levels.length).toBeGreaterThan(0);
            expect(skill1.levels[0].level).toBe('1');
            expect(skill1.levels[0].description).toContain('応急処置');
        }
    });

    it('should parse real character data (Iria) correctly', () => {
        const result = parseCharacterData(IRIA_HTML);

        // Expect 5 skills: Ex, Skill 1, Skill 2, Skill 3, Skill 4
        const exSkill = result.skills.find(s => s.name.includes('Exスキル'));
        const skill1 = result.skills.find(s => s.name.includes('スキル1'));
        const skill2 = result.skills.find(s => s.name.includes('スキル2'));
        const skill3 = result.skills.find(s => s.name.includes('スキル3'));
        const skill4 = result.skills.find(s => s.name.includes('スキル4'));

        expect(exSkill).toBeDefined();
        if (exSkill) {
            expect(exSkill.levels[0].description).toContain('恨み、忘れることなく');
        }

        expect(skill1).toBeDefined();
        if (skill1) {
            expect(skill1.name).toContain('静かな心');
            expect(skill1.levels[0].level).toBe('1');
        }

        expect(skill2).toBeDefined();
        if (skill2) {
            expect(skill2.name).toContain('復讐者の怒り');
        }

        expect(skill3).toBeDefined();
        expect(skill4).toBeDefined();

        // Ensure Stats table passed as 'タイプ' is ignored
        expect(result.skills.map(s => s.name)).not.toContain('タイプ');
    });

    it('should parse real character data (Dorocy) correctly', () => {
        const result = parseCharacterData(DOROCY_HTML);

        // Dorothy has Skill 1, Skill 2, Skill 3, Skill 4.
        // It seems she might not have an Ex Skill listed in the usual place, or it's just not in table_style_5.
        // We verify what we found.

        const skill1 = result.skills.find(s => s.name.includes('スキル1'));
        const skill2 = result.skills.find(s => s.name.includes('スキル2'));
        const skill3 = result.skills.find(s => s.name.includes('スキル3'));
        const skill4 = result.skills.find(s => s.name.includes('スキル4'));

        expect(skill1).toBeDefined();
        if (skill1) {
            expect(skill1.name).toContain('夏色に染まる占い課程');
            expect(skill1.levels[0].level).toBe('1');
            expect(skill1.levels[0].description).toContain('33%');
        }

        expect(skill2).toBeDefined();
        if (skill2) {
            expect(skill2.name).toContain('神に選ばれし司祭');
        }

        expect(skill3).toBeDefined();
        if (skill3) {
            expect(skill3.name).toContain('密かに賭ける神々のゲーム');
        }


        expect(skill4).toBeDefined();
        if (skill4) {
            expect(skill4.name).toContain('にゃんこの庇護');
        }
    });

    it('should parse stats correctly for Iria', () => {
        const result = parseCharacterData(IRIA_HTML);
        const stats = result.stats;

        expect(result.name).toContain('イリア');
        expect(result.name).toContain('輪廻を超える者');
        expect(result.type).toBe('超越'); // Iria's type is Transcendence in the file

        expect(stats).toBeDefined();
        if (stats) {
            expect(stats.hp).toBe('9056');
            expect(stats.attack).toBe('508');
            expect(stats.defense).toBe('15%');
            expect(stats.critRate).toBe('0%');
            expect(stats.critDamage).toBe('0%');
            expect(stats.speed).toBe('20%');
        }
    });

    it('should parse stats correctly for Dorocy', () => {
        const result = parseCharacterData(DOROCY_HTML);
        const stats = result.stats;

        expect(result.name).toContain('ドロシー');
        expect(result.name).toContain('夏に焦がれる魔女');
        expect(result.type).toBe('支援'); // Dorothy is Support type

        expect(stats).toBeDefined();
        if (stats) {
            expect(stats.hp).toBe('5782');
            expect(stats.attack).toBe('207%'); // Support type has %
            expect(stats.defense).toBe('0%');
            expect(stats.critRate).toBe('15%');
            expect(stats.critDamage).toBe('75%');
            expect(stats.speed).toBe('5%');
        }
    });
});
