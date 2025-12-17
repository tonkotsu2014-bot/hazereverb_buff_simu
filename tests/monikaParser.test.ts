// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseCharacterData } from '../src/logic/wikiParser';
import { MONIKA_HTML } from './testData';

describe('wikiParser - Monika', () => {
    it('should parse Monika skill 1 correctly', () => {
        const result = parseCharacterData(MONIKA_HTML);
        const skill1 = result.skills.find(s => s.name.includes('スキル1') || s.name.includes('激励'));

        expect(skill1).toBeDefined();
        if (skill1) {
            const level1 = skill1.levels.find(l => l.level === '1');
            expect(level1).toBeDefined();
            if (level1) {
                // Expected:
                // 1. Armor Down 10% (Fixed)
                // 2. Attack Up 30% (SupportScaling)
                console.log('Monika Skill 1 Level 1 Effects:', JSON.stringify(level1.effects, null, 2));

                // Currently this likely fails or finds only one effect if parsing is broken for 'を' or sentence splitting
                const armorEffect = level1.effects.find(e => e.attribute === 'Armor' && e.type === 'Debuff');
                const attackEffect = level1.effects.find(e => e.attribute === 'Attack' && e.type === 'Buff');

                expect(armorEffect).toBeDefined();
                expect(armorEffect?.value).toBe(10);

                expect(attackEffect).toBeDefined();
                expect(attackEffect?.value).toBe(30);
                expect(attackEffect?.calculationType).toBe('SupportScaling');
            }
        }
    });

    it('should parse Monika Ex Skill correctly', () => {
        const result = parseCharacterData(MONIKA_HTML);
        const exSkill = result.skills.find(s => s.name.includes('Ex') || s.name.includes('究極審問'));

        expect(exSkill).toBeDefined();
        if (exSkill) {
            const effects = exSkill.levels[0].effects;
            console.log('Monika Ex Skill Effects:', JSON.stringify(effects, null, 2));

            // Expected:
            // 1. Attack Up 60% (SupportScaling)
            // 2. CritDamage Up 80% (SupportScaling)
            // Duration 18 for both

            const attackEffect = effects.find(e => e.attribute === 'Attack');
            expect(attackEffect).toBeDefined();
            expect(attackEffect?.value).toBe(60);
            expect(attackEffect?.calculationType).toBe('SupportScaling');
            expect(attackEffect?.duration).toBe(18);

            const critDamageEffect = effects.find(e => e.attribute === 'CritDamage');
            expect(critDamageEffect).toBeDefined();
            expect(critDamageEffect?.value).toBe(80);
            expect(critDamageEffect?.calculationType).toBe('SupportScaling');
            expect(critDamageEffect?.duration).toBe(18);
        }
    });

    it('should parse Monika Skill 2 correctly (Shield/MaxHP)', () => {
        const result = parseCharacterData(MONIKA_HTML);
        const skill = result.skills.find(s => s.name.includes('スキル2') || s.name.includes('冷静維持'));

        expect(skill).toBeDefined();
        if (skill) {
            const level1 = skill.levels.find(l => l.level === '1');
            expect(level1).toBeDefined();
            if (level1) {
                // Current parser extracts 'HP 30' from 'MaxHP of 30%'. This is technically correct extraction even if type 'Debuff' is weird for Shield.
                console.log('Monika Skill 2 Level 1 Effects:', JSON.stringify(level1.effects, null, 2));
                expect(level1.effects.length).toBeGreaterThan(0);
                const hpEffect = level1.effects.find(e => e.attribute === 'Hp');
                expect(hpEffect).toBeDefined();
                expect(hpEffect?.value).toBe(30);
            }
        }
    });

    it('should parse Monika Skill 3 correctly (Existence Check)', () => {
        const result = parseCharacterData(MONIKA_HTML);
        const skill = result.skills.find(s => s.name.includes('スキル3') || s.name.includes('意識明瞭'));
        expect(skill).toBeDefined();
    });

    it('should parse Monika Skill 4 correctly (Mobility/Crit)', () => {
        const result = parseCharacterData(MONIKA_HTML);
        const skill = result.skills.find(s => s.name.includes('スキル4') || s.name.includes('臨戦態勢'));

        expect(skill).toBeDefined();
        if (skill) {
            const level1 = skill.levels.find(l => l.level === '1');
            expect(level1).toBeDefined();
            if (level1) {
                console.log('Monika Skill 4 Level 1 Effects:', JSON.stringify(level1.effects, null, 2));

                const mobilityEffect = level1.effects.find(e => e.attribute === 'Mobility');
                expect(mobilityEffect).toBeDefined();
                expect(mobilityEffect?.value).toBe(50);

                const critEffect = level1.effects.find(e => e.attribute === 'CritRate');
                expect(critEffect).toBeDefined();
                expect(critEffect?.value).toBe(20);
            }
        }
    });
});
