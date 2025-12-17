// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import * as fs from 'fs';
import * as path from 'path';
import { parseCharacterData, parseSkills, processSkillAttributes, SkillData } from '../src/logic/wikiParser';

describe('WikiParser Skill Level Issue', () => {
    // Original integration test
    it('Integration: should correctly parse skill levels and durations via parseCharacterData', () => {
        const htmlPath = path.resolve(__dirname, 'data/iria.html');
        // Check if file exists
        if (!fs.existsSync(htmlPath)) {
            console.warn('Iria data file not found, skipping test');
            return;
        }
        const html = fs.readFileSync(htmlPath, 'utf-8');
        const data = parseCharacterData(html);

        // Skill 1 Check
        // Iria Skill 1 Lv1: "自身の機動力が15%増加する。永続的に..." (Mobility)
        const skill1 = data.skills.find(s => s.name.includes('スキル1'));
        expect(skill1).toBeDefined();

        const skill1Level1 = skill1?.levels.find(l => l.level === '1');
        expect(skill1Level1?.effects.length).toBeGreaterThan(0);
        // Expect at least one effect to have duration -1 (Permanent)
        const permEffect = skill1Level1?.effects.find(e => e.duration === -1);
        expect(permEffect).toBeDefined();


        // Skill 4 Check (18 turns)
        // Iria Skill 4 Lv1: "...が30%増加する。18ターン持続する"
        const skill4 = data.skills.find(s => s.name.includes('スキル4'));
        expect(skill4).toBeDefined();
        const skill4Level1 = skill4?.levels.find(l => l.level === '1');
        const dur18Effect = skill4Level1?.effects.find(e => e.duration === 18);
        expect(dur18Effect).toBeDefined();
    });

    it('should parse compound effects sharing a verb (A 60%, B 80% UP)', () => {
        // Source: "すべての味方の攻撃力が支援力×60%、会心ダメージが支援力×80%アップし、18ターン持続する。"
        const skills: SkillData[] = [
            {
                name: 'Compound Skill',
                levels: [
                    {
                        level: 'Ex',
                        description: 'すべての味方の攻撃力が支援力×60%、会心ダメージが支援力×80%アップし、18ターン持続する。',
                        effects: []
                    }
                ]
            }
        ];

        const processed = processSkillAttributes(skills);
        const effects = processed[0].levels[0].effects;

        expect(effects).toHaveLength(2);

        // Effect 1: Attack (SupportScaling, 60%, 18 turns)
        const attackEffect = effects.find(e => e.attribute === 'Attack');
        expect(attackEffect).toBeDefined();
        expect(attackEffect?.calculationType).toBe('SupportScaling');
        expect(attackEffect?.value).toBe(60);
        expect(attackEffect?.duration).toBe(18);

        // Effect 2: CritDamage (SupportScaling, 80%, 18 turns)
        const cdEffect = effects.find(e => e.attribute === 'CritDamage');
        expect(cdEffect).toBeDefined();
        expect(cdEffect?.calculationType).toBe('SupportScaling');
        expect(cdEffect?.value).toBe(80);
        expect(cdEffect?.duration).toBe(18);
    });

    it('should parse effects with preambles/sub-skill names (♦SkillName...)', () => {
        // Source: "♦激発永続的にターゲットの装甲値を10%ダウンする。♦火力アシストターゲットの攻撃力が支援力×30%アップし、18ターン持続する。"
        const skills: SkillData[] = [
            {
                name: 'Preamble Skill',
                levels: [
                    {
                        level: '1',
                        description: '♦激発永続的にターゲットの装甲値を10%ダウンする。♦火力アシストターゲットの攻撃力が支援力×30%アップし、18ターン持続する。',
                        effects: []
                    }
                ]
            }
        ];

        const processed = processSkillAttributes(skills);
        const effects = processed[0].levels[0].effects;
        console.log('Preamble Test Effects:', JSON.stringify(effects, null, 2));

        expect(effects).toHaveLength(2);

        // Effect 1: Armor Down 10% (Fixed, Permanent? "永続的に")
        const armorEffect = effects.find(e => e.attribute === 'Armor');
        expect(armorEffect).toBeDefined();
        expect(armorEffect?.type).toBe('Debuff');
        expect(armorEffect?.value).toBe(10);
        expect(armorEffect?.duration).toBe(-1); // "永続的に"

        // Effect 2: Attack Up Support*30% (SupportScaling, 18 turns)
        const attackEffect = effects.find(e => e.attribute === 'Attack');
        expect(attackEffect).toBeDefined();
        expect(attackEffect?.calculationType).toBe('SupportScaling');
        expect(attackEffect?.value).toBe(30);
        expect(attackEffect?.duration).toBe(18);
    });



    // Unit test for parseSkills
    describe('parseSkills (Structural Parsing)', () => {
        it('should structure single-cell rows as levels with null description', () => {
            const htmlPath = path.resolve(__dirname, 'data/iria.html');
            if (!fs.existsSync(htmlPath)) return;
            const html = fs.readFileSync(htmlPath, 'utf-8');
            const parser = new DOMParser();
            const doc = parser.parseFromString(html, 'text/html');

            const skills = parseSkills(doc);
            const skill1 = skills.find(s => s.name.includes('スキル1'));

            expect(skill1).toBeDefined();

            // Check Level 2 (should be single cell in HTML)
            const level2 = skill1?.levels.find(l => l.level === '2');
            expect(level2).toBeDefined();
            expect(level2?.description).toBeNull();
            // Effects should be empty array
            expect(level2?.effects).toEqual([]);
        });
    });

    // Unit test for processSkillAttributes
    describe('processSkillAttributes (Logic Extraction)', () => {
        it('should extract duration correctly and assign to effects', () => {
            const skills: SkillData[] = [
                {
                    name: 'Test Skill',
                    levels: [
                        { level: '1', description: '攻撃力が20%増加する。12ターン持続する。', effects: [] },
                        { level: '2', description: 'クリティカル率が15%増加する。永続的に発動。', effects: [] },
                        { level: '3', description: 'No duration here.', effects: [] }
                    ]
                }
            ];

            const processed = processSkillAttributes(skills);

            // Level 1
            expect(processed[0].levels[0].effects[0].duration).toBe(12);
            expect(processed[0].levels[0].effects[0].attribute).toBe('Attack');

            // Level 2
            expect(processed[0].levels[1].effects[0].duration).toBe(-1);
            expect(processed[0].levels[1].effects[0].attribute).toBe('CritRate');

            // Level 3 (No effects extracted because "No duration here" has no attribute keyword)
            expect(processed[0].levels[2].effects).toHaveLength(0);
        });

        it('should split multiple effects with different durations', () => {
            const skills: SkillData[] = [
                {
                    name: 'Multi Duration Skill',
                    levels: [
                        { level: '1', description: '攻撃力が20%増加する。これは12ターン持続する。会心率が50%増加する。これは9ターン持続する。', effects: [] }
                    ]
                }
            ];

            const processed = processSkillAttributes(skills);
            const effects = processed[0].levels[0].effects;

            expect(effects).toHaveLength(2);

            // Effect 1: Attack, 20%, 12 turns
            expect(effects[0].attribute).toBe('Attack');
            expect(effects[0].value).toBe(20);
            expect(effects[0].duration).toBe(12);

            // Effect 2: CritRate, 50%, 9 turns
            expect(effects[1].attribute).toBe('CritRate');
            expect(effects[1].value).toBe(50);
            expect(effects[1].duration).toBe(9);
        });

        it('should extract fixed value effects without duration', () => {
            const skills: SkillData[] = [
                {
                    name: 'Buff Skill',
                    levels: [
                        { level: '1', description: '機動力が15%増加する。', effects: [] },
                        { level: '2', description: '敵の装甲が20%低下させる。', effects: [] }
                    ]
                }
            ];

            const processed = processSkillAttributes(skills);

            // Level 1: Mobility Increase (Buff)
            expect(processed[0].levels[0].effects).toHaveLength(1);
            expect(processed[0].levels[0].effects[0].attribute).toBe('Mobility');
            expect(processed[0].levels[0].effects[0].duration).toBeUndefined();

            // Level 2: Armor Decrease (Debuff)
            expect(processed[0].levels[1].effects).toHaveLength(1);
            expect(processed[0].levels[1].effects[0].attribute).toBe('Armor');
            expect(processed[0].levels[1].effects[0].type).toBe('Debuff');
        });

        it('should extract support scaling effects', () => {
            const skills: SkillData[] = [
                {
                    name: 'Scaling Skill',
                    levels: [
                        { level: '1', description: 'クリティカルダメージが支援力×33%増加する。', effects: [] }
                    ]
                }
            ];

            const processed = processSkillAttributes(skills);

            expect(processed[0].levels[0].effects).toHaveLength(1);
            expect(processed[0].levels[0].effects[0]).toEqual({
                type: 'Buff',
                calculationType: 'SupportScaling',
                attribute: 'CritDamage',
                value: 33,
                target: 'Default'
            });
        });

        it('should exclude damage dealing effects', () => {
            const skills: SkillData[] = [
                {
                    name: 'Attack Skill',
                    levels: [
                        { level: '1', description: '機動力×攻撃力×300%の固定ダメージを与える。', effects: [] }
                    ]
                }
            ];

            const processed = processSkillAttributes(skills);
            expect(processed[0].levels[0].effects).toHaveLength(0);
        });

        it('should NOT extract EffectHitRate, or EffectResist', () => {
            const skills: SkillData[] = [
                {
                    name: 'Excluded Attributes Skill',
                    levels: [
                        { level: '1', description: '効果命中が5%アップ。効果抵抗が5%アップ。', effects: [] }
                    ]
                }
            ];

            const processed = processSkillAttributes(skills);
            expect(processed[0].levels[0].effects).toHaveLength(0);
        });
    });

    // Syusyu Test Case
    it('Integration: should correctly parse Syusyu skills and durations', () => {
        const htmlPath = path.resolve(__dirname, 'data/syusyu.html');
        if (!fs.existsSync(htmlPath)) {
            console.warn('Syusyu data file not found, skipping test');
            return;
        }
        const html = fs.readFileSync(htmlPath, 'utf-8');
        const data = parseCharacterData(html);

        // Skill 2: 刺激を求めて (Provoke) - Not a stat buff, so currently no effect extracted.
        // We verify Skill 4 instead which has a Stat Buff.

        // Skill 4: もっと大きく!
        // Lv1: Permanent DamageReduction +60%
        const skill4 = data.skills.find(s => s.name.includes('もっと大きく'));
        expect(skill4).toBeDefined();
        if (skill4) {
            const lv1 = skill4.levels.find(l => l.level === '1');
            const effect = lv1?.effects.find(e => e.attribute === 'DamageReduction');
            expect(effect).toBeDefined();
            expect(effect?.value).toBe(60);
            expect(effect?.duration).toBe(-1);
        }

        // Check Effect Extraction for Syusyu Skill 1
        // Syusyu Skill 1 Lv1: "自身のダメージ軽減率が60%増加する"
        const skill1 = data.skills.find(s => s.name.includes('いじめないで'));
        if (skill1) {
            const lv1 = skill1.levels.find(l => l.level === '1');
            const damageRedEffect = lv1?.effects.find(e => e.attribute === 'DamageReduction');
            expect(damageRedEffect).toBeDefined();
            expect(damageRedEffect?.value).toBe(60);
        }
    });
});
