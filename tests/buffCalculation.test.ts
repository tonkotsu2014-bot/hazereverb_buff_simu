import { describe, it, expect } from 'vitest';
import { calculateMaxBuffs, CalculatedBuffs, getStackableSkills } from '../src/logic/buffCalculation';
import { ParsedCharacterData, SkillData, processSkillAttributes } from '../src/logic/wikiParser';
import fs from 'fs';
import path from 'path';

// Helper to create a simplified character for testing
const createChar = (name: string, effects: any[], stats: any = {}): ParsedCharacterData => {
    return {
        name,
        stats: { critRate: 0, critDamage: 0, ...stats },
        skills: [
            {
                name: 'Test Skill',
                levels: [
                    {
                        level: '1',
                        description: null,
                        effects: effects
                    }
                ]
            }
        ]
    };
};

describe('calculateMaxBuffs', () => {
    // 1. バフなしの状態で基本ステータスが正しく計算されるか検証
    it('should calculate base stats with no buffs', () => {
        const attacker = createChar('Attacker', [], { critRate: 10, critDamage: 150 });
        const result = calculateMaxBuffs(attacker, []);

        expect(result.attackIncreasePercent).toBe(0);
        expect(result.critRateTotal).toBe(10);
        expect(result.critDamageTotal).toBe(150);
    });

    // 2. 攻撃役自身の自己バフ (Target: Self) が適用されるか検証
    it('should apply attacker self buffs', () => {
        const attacker = createChar('Attacker', [
            { type: 'Buff', attribute: 'Attack', value: 20, target: 'Self' },
            { type: 'Buff', attribute: 'CritRate', value: 15, target: 'Self' }
        ], { critRate: 10 });

        const result = calculateMaxBuffs(attacker, []);

        expect(result.attackIncreasePercent).toBe(20);
        expect(result.critRateTotal).toBe(25); // 10 + 15
    });

    // 3. 支援役からの全体バフ (Target: AllAllies) が適用されるか検証
    it('should apply supporter buffs (AllAllies)', () => {
        const attacker = createChar('Attacker', [], { critRate: 10 });
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Attack', value: 30, target: 'AllAllies' }
        ]);

        const result = calculateMaxBuffs(attacker, [supporter]);

        expect(result.attackIncreasePercent).toBe(30);
    });

    // 4. 支援役からのデフォルトターゲットバフ (Target: Default) が適用されるか検証
    // ※シミュレーション上、支援役の単体バフは攻撃役にかかると仮定
    it('should apply supporter buffs (Default)', () => {
        const attacker = createChar('Attacker', [], { critRate: 10 });
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'CritDamage', value: 50, target: 'Default' }
        ]);

        const result = calculateMaxBuffs(attacker, [supporter]);

        expect(result.critDamageTotal).toBe(50); // 0 + 50
    });

    // 5. 支援役の自己バフ (Target: Self) が攻撃役には適用されないことを検証
    it('should NOT apply supporter buffs targeted at Self', () => {
        const attacker = createChar('Attacker', [], { critRate: 10 });
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Attack', value: 50, target: 'Self' }
        ]);

        const result = calculateMaxBuffs(attacker, [supporter]);

        expect(result.attackIncreasePercent).toBe(0);
    });

    // 6. 複数のバフが正しく加算（スタック）されるか検証
    it('should stack multiple buffs', () => {
        const attacker = createChar('Attacker', [
            { type: 'Buff', attribute: 'Attack', value: 10, target: 'Self' }
        ], { critRate: 5 });

        const supp1 = createChar('Supp1', [
            { type: 'Buff', attribute: 'Attack', value: 20, target: 'AllAllies' }
        ]);

        const supp2 = createChar('Supp2', [
            { type: 'Buff', attribute: 'CritRate', value: 10, target: 'AllAllies' }
        ]);

        const result = calculateMaxBuffs(attacker, [supp1, supp2]);

        expect(result.attackIncreasePercent).toBe(30); // 10 + 20
        expect(result.critRateTotal).toBe(15); // 5 + 10
    });

    // 7. 実際のキャラクターデータ（JSON）を読み込んで動作するか検証（部分的な結合テスト）
    it('should load and test with real data (partial test)', () => {
        const dataPath = path.join(__dirname, 'data', 'test_characters.json');
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        // Apply processSkillAttributes to ensure effects are parsed and inherited
        const characters = (JSON.parse(rawData) as ParsedCharacterData[]).map(c => ({
            ...c,
            skills: processSkillAttributes(c.skills)
        }));

        // Find a character to use as attacker
        const attacker = characters.find(c => c.name?.includes('ヴェリル') ?? false)!; // Attacker role
        // Find a supporter
        // Let's use 'コースガード' (Transcendence/Supportish?) or create a mock one if needed.
        // Course Guard (コースガード) skill 2 level 10: Crit damage +50% to all allies.
        const supporter = characters.find(c => c.name?.includes('コースガード') ?? false);

        // If Course Guard is not found (might be missing in partial json), use another or mock.
        // For this test we just want to ensure NO CRash.
        // Expect result to be defined.
        if (attacker) {
            const result = calculateMaxBuffs(attacker, []);
            expect(result).toBeDefined();
        }
    });

    // 8. アタッカー: コースガード, 支援: メリア のケース検証
    // メリアのスキルレベルを変更して、空の説明文からの継承動作も確認する
    it('should correctly calculate buffs for Course Guard + Melia with skill inheritance', () => {
        const dataPath = path.join(__dirname, 'data', 'test_characters.json');
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        // Apply logic
        const characters = (JSON.parse(rawData) as ParsedCharacterData[]).map(c => ({
            ...c,
            skills: processSkillAttributes(c.skills)
        }));

        const attacker = characters.find(c => c.name?.includes('コースガード') ?? false);
        // The character with 4%/8%/12% scaling is 'きっと見つける(プロミス) 大川村寧'
        const supporter = characters.find(c => c.name?.includes('大川村寧') ?? false);

        console.log('Attacker found:', attacker?.name);
        console.log('Supporter found:', supporter?.name);

        if (!attacker || !supporter) {
            console.warn('Test skipped: Course Guard or Supporter not found in test data.');
            return;
        }

        console.log('Supporter Skills:', supporter.skills.map(s => s.name));


        // Helper to get Supporter at specific skill level
        const getSupporterAtLevel = (targetLevel: string) => {
            // Skill 1: "果実がもたらす希望"
            const skillIndex = supporter.skills.findIndex(s => s.name.includes('スキル1') || s.name.includes('果実がもたらす希望'));
            if (skillIndex === -1) {
                const names = supporter.skills.map(s => s.name).join(', ');
                throw new Error(`Supporter skill 1 not found. Available skills: ${names}`);
            }

            const originalSkill = supporter.skills[skillIndex];
            // Find the level index
            const levelIndex = originalSkill.levels.findIndex(l => l.level === targetLevel);
            if (levelIndex === -1) throw new Error(`Level ${targetLevel} not found`);

            const modifiedSkill = {
                ...originalSkill,
                levels: originalSkill.levels.slice(0, levelIndex + 1)
            };

            const modifiedSupporter = {
                ...supporter,
                skills: [...supporter.skills]
            };
            modifiedSupporter.skills[skillIndex] = modifiedSkill;
            return modifiedSupporter;
        };

        const supportPower = parseFloat(String(supporter.stats?.Support || '0'));

        // Calculate solo results to account for Attacker's base stats AND self-buffs
        const soloRes = calculateMaxBuffs(attacker, []);
        const baseCritRateTotal = soloRes.critRateTotal;
        const baseCritDamageTotal = soloRes.critDamageTotal;


        // Case 1: Level 1 (4% scaling)
        const supLv1 = getSupporterAtLevel('1');
        const resLv1 = calculateMaxBuffs(attacker, [supLv1]);

        expect(resLv1.critRateTotal).toBeCloseTo(baseCritRateTotal + (supportPower * 0.04), 1);

        // Case 2: Level 2 (Description is null in JSON, should inherit Level 1)
        const supLv2 = getSupporterAtLevel('2');
        const resLv2 = calculateMaxBuffs(attacker, [supLv2]);
        expect(resLv2.critRateTotal).toBeCloseTo(baseCritRateTotal + (supportPower * 0.04), 1);

        // Case 3: Level 3 (8% scaling)
        const supLv3 = getSupporterAtLevel('3');
        const resLv3 = calculateMaxBuffs(attacker, [supLv3]);
        expect(resLv3.critRateTotal).toBeCloseTo(baseCritRateTotal + (supportPower * 0.08), 1);

        // Case 4: Level 5 (12% and 40%)
        const supLv5 = getSupporterAtLevel('5');
        const resLv5 = calculateMaxBuffs(attacker, [supLv5]);
        expect(resLv5.critRateTotal).toBeCloseTo(baseCritRateTotal + (supportPower * 0.12), 1);
        expect(resLv5.critDamageTotal).toBeCloseTo(baseCritDamageTotal + (supportPower * 0.40), 1);

        // Case 5: Level 6 (Inherit Level 5)
        const supLv6 = getSupporterAtLevel('6');
        const resLv6 = calculateMaxBuffs(attacker, [supLv6]);
        expect(resLv6.critRateTotal).toBeCloseTo(baseCritRateTotal + (supportPower * 0.12), 1);
        expect(resLv6.critDamageTotal).toBeCloseTo(baseCritDamageTotal + (supportPower * 0.40), 1);
    });


    // 9. Attacker with -40% Attack Debuff and Supporter with 20% scaling (161 support power)
    it('should correctly calculate net buff with attacker debuff and supporter buff', () => {
        const attacker = createChar('Attacker', [
            { type: 'Debuff', attribute: 'Attack', value: 40, target: 'Self' }
        ], { attack: 1000 });

        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Attack', value: 20, calculationType: 'SupportScaling', target: 'AllAllies' }
        ], { Support: 161 });

        const result = calculateMaxBuffs(attacker, [supporter]);

        // Attacker: -40%
        // Supporter: 161 * 20% = 32.2%
        // Total: -40 + 32.2 = -7.8%
        expect(result.attackIncreasePercent).toBeCloseTo(-7.8, 1);
    });

    // 10. Stackable Buffs
    it('should correctly calculate stackable buffs', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Attack', value: 10, target: 'AllAllies', isStackable: true }
        ]);

        const result = calculateMaxBuffs(attacker, [supporter], { 'Test Skill': 3 });

        // 10 * 3 = 30
        expect(result.attackIncreasePercent).toBe(30);
    });

    // 11. Complex Scenario: Supporter Self-Buff -> Buff Attacker
    it('should correctly calculate buff when supporter buffs self first', () => {
        // Attacker: CritDamage 0, CritRate 20, Skill: AllAllies CritDamage + 50%
        const attacker = createChar('Attacker', [
            { type: 'Buff', attribute: 'CritDamage', value: 50, target: 'AllAllies' }
        ], { critRate: 20, critDamage: 0 });

        const supporter = createChar('Supporter', [], { Support: 110 });
        supporter.skills = [
            {
                name: 'Skill 1',
                // Use 'Support' as attribute to be precise, though 'Attack' also works in logic now.
                levels: [{ level: '1', description: null, effects: [{ type: 'Buff', attribute: 'Support', value: 90, target: 'Self' }] }]
            },
            {
                name: 'Skill 2',
                levels: [{
                    level: '1', description: null, effects: [
                        { type: 'Buff', attribute: 'CritDamage', value: 85, calculationType: 'SupportScaling', target: 'Default' },
                        { type: 'Buff', attribute: 'CritRate', value: 85, calculationType: 'SupportScaling', target: 'Default' }
                    ]
                }]
            }
        ];

        const result = calculateMaxBuffs(attacker, [supporter]);

        // Support Power: 110 + 90 = 200
        // Buff Value: 200 * 0.85 = 170
        // Attacker Base: CritRate 20, CritDmg 0
        // Attacker Buff: CritDmg + 50
        // Total Rate: 20 + 170 = 190
        // Total Dmg: 0 + 50 + 170 = 220

        expect(result.critRateTotal).toBeCloseTo(190, 1);
        expect(result.critDamageTotal).toBeCloseTo(220, 1);
    });

    // 12. Verify Modifiers Logging
    it('should include modifier logs', () => {
        const attacker = createChar('Attacker', [
            { type: 'Buff', target: 'Self', attribute: 'Attack', value: 20 }
        ]);

        const supporter = createChar('Supporter', [
            { type: 'Buff', target: 'AllAllies', attribute: 'CritRate', value: 15 }
        ]);

        const result = calculateMaxBuffs(attacker, [supporter]);

        expect(result.modifiers).toBeDefined();
        // Since we process Attacker first then Supporters in the loop:
        // Attacker -> Self Buff -> Attack 20
        // Supporter -> Buff -> CritRate 15

        expect(result.modifiers).toEqual(expect.arrayContaining([
            expect.objectContaining({
                sourceCharacterName: 'Attacker',
                skillName: 'Test Skill', // default from createChar
                attribute: 'Attack',
                value: 20
            }),
            expect.objectContaining({
                sourceCharacterName: 'Supporter',
                skillName: 'Test Skill',
                attribute: 'CritRate',
                value: 15
            })
        ]));
    });

    // 13. User Requested Test: Course Guard (Attacker) + Melia & Monica (Supporters)
    it('should log all necessary skills for Course Guard (Attacker) + Melia & Monica (Supporters)', () => {
        const dataPath = path.join(__dirname, 'data', 'test_characters.json');
        const rawData = fs.readFileSync(dataPath, 'utf-8');
        const characters = (JSON.parse(rawData) as ParsedCharacterData[]).map(c => ({
            ...c,
            skills: processSkillAttributes(c.skills)
        }));

        const attacker = characters.find(c => c.name?.includes('清浄の騎士 コースガード'));
        const melia = characters.find(c => c.name?.includes('神聖Trick メリア'));
        const monica = characters.find(c => c.name?.includes('懲罰の審問官 モニカ'));

        if (!attacker || !melia || !monica) {
            console.warn('Skipping test: Characters not found');
            return;
        }

        const result = calculateMaxBuffs(attacker, [melia, monica]);

        const modifierNames = result.modifiers.map(m => m.sourceCharacterName);
        const skillNames = result.modifiers.map(m => m.skillName);

        // console.log('Modifiers:', JSON.stringify(result.modifiers, null, 2));
        /*
        Expected Log Output:
        [
          {
            "sourceCharacterName": "清浄の騎士 コースガード",
            "skillName": "スキル2/天険のごとく",
            "skillLevel": "10",
            "description": "♦防護障壁 軽減   バフ\n毎ラウンド開始時に、自身のダメージ軽減\n率が165%増加する。これは12ターン持続す\nる。\n♦出力増幅 強化   バフ\n毎ラウンド開始時に、すべての味方のクリ\nティカルダメージが50%増加する。これは\n18ターン持続する。",
            "effectType": "Buff",
            "attribute": "DamageReduction",
            "value": 165
          },
          {
            "sourceCharacterName": "清浄の騎士 コースガード",
            "skillName": "スキル2/天険のごとく",
            "skillLevel": "10",
            "description": "♦防護障壁 軽減   バフ\n毎ラウンド開始時に、自身のダメージ軽減\n率が165%増加する。これは12ターン持続す\nる。\n♦出力増幅 強化   バフ\n毎ラウンド開始時に、すべての味方のクリ\nティカルダメージが50%増加する。これは\n18ターン持続する。",
            "effectType": "Buff",
            "attribute": "CritDamage",
            "value": 50
          },
          {
            "sourceCharacterName": "神聖Trick メリア",
            "skillName": "スキル1/武運の恩恵",
            "skillLevel": "10",
            "effectType": "Buff",
            "attribute": "Attack",
            "value": 123.6
          },
          {
            "sourceCharacterName": "神聖Trick メリア",
            "skillName": "スキル1/武運の恩恵",
            "skillLevel": "10",
            "effectType": "Buff",
            "attribute": "CritDamage",
            "value": 72.1
          },
          {
            "sourceCharacterName": "神聖Trick メリア",
            "skillName": "スキル4/運命を掠め取る  覚醒開放",
            "skillLevel": "10",
            "effectType": "Debuff",
            "attribute": "Mobility",
            "value": -30
          },
          {
            "sourceCharacterName": "神聖Trick メリア",
            "skillName": "スキル4/運命を掠め取る  覚醒開放",
            "skillLevel": "10",
            "effectType": "Buff",
            "attribute": "CritRate",
            "value": 51.5
          },
          {
            "sourceCharacterName": "神聖Trick メリア",
            "skillName": "スキル4/運命を掠め取る  覚醒開放",
            "skillLevel": "10",
            "effectType": "Buff",
            "attribute": "CritDamage",
            "value": 103
          },
          {
            "sourceCharacterName": "懲罰の審問官 モニカ",
            "skillName": "究極審問!",
            "skillLevel": "Ex",
            "description": "♦究極審問!\n自身行動前、味方が2名かそれ以上戦闘不\n能となった場合、すべての味方の攻撃力が\n支援力×60%、会心ダメージが支援力\n×80%アップし、18ターン持続する。",
            "effectType": "Buff",
            "attribute": "Attack",
            "value": 42
          },
          {
            "sourceCharacterName": "懲罰の審問官 モニカ",
            "skillName": "究極審問!",
            "skillLevel": "Ex",
            "description": "♦究極審問!\n自身行動前、味方が2名かそれ以上戦闘不\n能となった場合、すべての味方の攻撃力が\n支援力×60%、会心ダメージが支援力\n×80%アップし、18ターン持続する。",
            "effectType": "Buff",
            "attribute": "CritDamage",
            "value": 56
          },
          {
            "sourceCharacterName": "懲罰の審問官 モニカ",
            "skillName": "スキル1/激励",
            "skillLevel": "10",
            "effectType": "Debuff",
            "attribute": "Armor",
            "value": -10
          },
          {
            "sourceCharacterName": "懲罰の審問官 モニカ",
            "skillName": "スキル1/激励",
            "skillLevel": "10",
            "effectType": "Buff",
            "attribute": "Attack",
            "value": 49
          },
          {
            "sourceCharacterName": "懲罰の審問官 モニカ",
            "skillName": "スキル4/臨戦態勢   覚醒開放",
            "skillLevel": "10",
            "description": "♦激発\n永続的にターゲットの機動力を30%ダウン\nする。\n♦弱点・出力アシスト\nターゲットの会心率が支援力×20%、会心\nダメージが支援力×70%アップし、18ター\nン持続する。",
            "effectType": "Debuff",
            "attribute": "Mobility",
            "value": -30
          },
          {
            "sourceCharacterName": "懲罰の審問官 モニカ",
            "skillName": "スキル4/臨戦態勢   覚醒開放",
            "skillLevel": "10",
            "description": "♦激発\n永続的にターゲットの機動力を30%ダウン\nする。\n♦弱点・出力アシスト\nターゲットの会心率が支援力×20%、会心\nダメージが支援力×70%アップし、18ター\nン持続する。",
            "effectType": "Buff",
            "attribute": "CritRate",
            "value": 14
          },
          {
            "sourceCharacterName": "懲罰の審問官 モニカ",
            "skillName": "スキル4/臨戦態勢   覚醒開放",
            "skillLevel": "10",
            "description": "♦激発\n永続的にターゲットの機動力を30%ダウン\nする。\n♦弱点・出力アシスト\nターゲットの会心率が支援力×20%、会心\nダメージが支援力×70%アップし、18ター\nン持続する。",
            "effectType": "Buff",
            "attribute": "CritDamage",
            "value": 49
          }
        ]
        */

        expect(modifierNames).toContain(attacker.name);
        expect(modifierNames).toContain(melia.name);

        // Melia should provide buffs
        expect(skillNames).toEqual(expect.arrayContaining([
            expect.stringContaining('武運の恩恵'), // Melia Skill 1
            expect.stringContaining('運命を掠め取る'), // Melia Skill 4
        ]));

        // Monica should provide buffs
        expect(skillNames).toEqual(expect.arrayContaining([
            expect.stringContaining('激励'), // Monica Skill 1
            expect.stringContaining('臨戦態勢'), // Monica Skill 4
        ]));
    });

    it('should respect Ex skill toggle', () => {
        const attacker = createChar('Attacker', [
            { type: 'Buff', target: 'Self', attribute: 'Attack', value: 20 }
        ]);
        // Mock Ex skill
        (attacker.skills[0].levels[0] as any).level = 'Ex';

        // 1. Default (Enabled)
        let result = calculateMaxBuffs(attacker, []);
        expect(result.attackIncreasePercent).toBe(20);

        // 2. Disabled
        result = calculateMaxBuffs(attacker, [], {}, { 'Attacker': false });
        expect(result.attackIncreasePercent).toBe(0);

        // 3. Explicitly Enabled
        result = calculateMaxBuffs(attacker, [], {}, { 'Attacker': true });
        expect(result.attackIncreasePercent).toBe(20);
    });

    it('should correctly handle Ex skill toggles for Attacker and Supporters', () => {
        // Setup Attacker with Ex Skill (Attack +10)
        const attacker = createChar('Attacker', [
            { type: 'Buff', target: 'Self', attribute: 'Attack', value: 10 }
        ]);
        (attacker.skills[0].levels[0] as any).level = 'Ex';

        // Setup Supporter 1 with Ex Skill (CritRate +10)
        const supporter1 = createChar('Supporter1', [
            { type: 'Buff', target: 'AllAllies', attribute: 'CritRate', value: 10 }
        ]);
        (supporter1.skills[0].levels[0] as any).level = 'Ex';

        // Setup Supporter 2 with Ex Skill (CritDamage +10)
        const supporter2 = createChar('Supporter2', [
            { type: 'Buff', target: 'AllAllies', attribute: 'CritDamage', value: 10 }
        ]);
        (supporter2.skills[0].levels[0] as any).level = 'Ex';

        const supporters = [supporter1, supporter2];

        // 1. All Enabled (Default)
        let result = calculateMaxBuffs(attacker, supporters);
        expect(result.attackIncreasePercent).toBe(10);
        expect(result.critRateTotal).toBe(10); // Base 0 + 10
        expect(result.critDamageTotal).toBe(10); // Base 0 + 10

        // 2. Attacker Ex Disabled
        result = calculateMaxBuffs(attacker, supporters, {}, { 'Attacker': false });
        expect(result.attackIncreasePercent).toBe(0);
        expect(result.critRateTotal).toBe(10);
        expect(result.critDamageTotal).toBe(10);

        // 3. Supporter 1 Ex Disabled
        result = calculateMaxBuffs(attacker, supporters, {}, { 'Supporter1': false });
        expect(result.attackIncreasePercent).toBe(10);
        expect(result.critRateTotal).toBe(0);
        expect(result.critDamageTotal).toBe(10);

        // 4. All Disabled
        result = calculateMaxBuffs(attacker, supporters, {}, {
            'Attacker': false,
            'Supporter1': false,
            'Supporter2': false
        });
        expect(result.attackIncreasePercent).toBe(0);
        expect(result.critRateTotal).toBe(0);
        expect(result.critDamageTotal).toBe(0);

        // 5. Mixed: Attacker ON, Supporter 1 OFF, Supporter 2 ON
        result = calculateMaxBuffs(attacker, supporters, {}, {
            'Attacker': true,
            'Supporter1': false,
            'Supporter2': true
        });
        expect(result.attackIncreasePercent).toBe(10);
        expect(result.critRateTotal).toBe(0);
        expect(result.critDamageTotal).toBe(10);
    });

    it('should respect active skill levels', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });
        const supporter = {
            name: 'Supporter',
            stats: { Support: 100 },
            skills: [
                {
                    name: 'Support Skill',
                    levels: [
                        { level: '1', description: null, effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 10 }] },
                        { level: '10', description: null, effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 100 }] }
                    ]
                }
            ]
        } as unknown as ParsedCharacterData;

        // 1. Default (Max)
        const resDefault = calculateMaxBuffs(attacker, [supporter]);
        expect(resDefault.attackIncreasePercent).toBe(100);

        // 2. Level 1
        const resLv1 = calculateMaxBuffs(attacker, [supporter], {}, {}, { 'Supporter': '1' });
        expect(resLv1.attackIncreasePercent).toBe(10);

        // 3. Level 10
        const resLv10 = calculateMaxBuffs(attacker, [supporter], {}, {}, { 'Supporter': '10' });
        expect(resLv10.attackIncreasePercent).toBe(100);
    });

    it('should apply active skill level to ALL skills of the character', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });
        const supporter = {
            name: 'DualSkillSupporter',
            stats: { Support: 100 },
            skills: [
                {
                    name: 'Skill A',
                    levels: [
                        { level: '1', description: null, effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 10 }] },
                        { level: '10', description: null, effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 100 }] }
                    ]
                },
                {
                    name: 'Skill B',
                    levels: [
                        { level: '1', description: null, effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 5 }] },
                        { level: '10', description: null, effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 50 }] }
                    ]
                }
            ]
        } as unknown as ParsedCharacterData;

        // 1. Level 1 (Should be 10 + 5 = 15)
        const resLv1 = calculateMaxBuffs(attacker, [supporter], {}, {}, { 'DualSkillSupporter': '1' });
        expect(resLv1.attackIncreasePercent).toBe(15);

        // 2. Level 10 (Should be 100 + 50 = 150)
        const resLv10 = calculateMaxBuffs(attacker, [supporter], {}, {}, { 'DualSkillSupporter': '10' });
        expect(resLv10.attackIncreasePercent).toBe(150);
    });

    it('should apply support power buffs from one supporter to another', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });

        // Supporter A: All Allies Attack + 20%
        const supporterA = {
            name: 'SupporterA',
            stats: { Support: 100 },
            skills: [
                {
                    name: 'BuffAll',
                    levels: [
                        {
                            level: '10',
                            description: null,
                            effects: [
                                { type: 'Buff', target: 'AllAllies', attribute: 'Support', value: 20 },
                                { type: 'Buff', target: 'AllAllies', attribute: 'CritRate', value: 10, calculationType: 'SupportScaling' }
                            ]
                        }
                    ]
                }
            ]
        } as unknown as ParsedCharacterData;

        // Supporter B: Scales off Support Power.
        // Base Support = 100.
        // With Buff from A (+20 Support) = 120. (Also +10 CritRate from A, but Support Power doesn't use CritRate)
        // Skill gives 100% of Support Power as Attack to All Allies.
        const supporterB = {
            name: 'SupporterB',
            stats: { Support: 100 },
            skills: [
                {
                    name: 'ScalingBuff',
                    levels: [
                        {
                            level: '10',
                            description: null,
                            effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 100, calculationType: 'SupportScaling' }]
                        }
                    ]
                }
            ]
        } as unknown as ParsedCharacterData;

        // Total Buffs on Attacker:
        // 1. From A:
        //    - Support +20 -> Ignored (Attribute Support).
        //    - CritRate +10 (Scaled):
        //      - A's Support Power = 100 (Base) + 20 (Buff from self/A) = 120.
        //      - CritRate Buff = 10 * (120/100) = 12.
        // 2. From B:
        //    - Scaled Attack Buff: 100% of B's Support Power (120) -> 120% Attack.
        // Total Attack: 120%
        // Total CritRate: 12%

        const result = calculateMaxBuffs(attacker, [supporterA, supporterB]);

        expect(result.attackIncreasePercent).toBe(120);
        expect(result.critRateTotal).toBe(12);
    });

    it('should correctly stack Self Support buff AND Global Support buff from another supporter', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });

        // Supporter A: 
        // 1. Self Support + 50 (Buff, Target: Self, Attribute: Support)
        // 2. Scaling Buff (100% Support -> Attack to AllAllies)
        const supporterA = {
            name: 'SupporterA',
            stats: { Support: 100 },
            skills: [
                {
                    name: 'SelfBuffAndScale',
                    levels: [
                        {
                            level: '10',
                            description: null,
                            effects: [
                                { type: 'Buff', target: 'Self', attribute: 'Support', value: 50 },
                                { type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 100, calculationType: 'SupportScaling' }
                            ]
                        }
                    ]
                }
            ]
        } as unknown as ParsedCharacterData;

        // Supporter B:
        // 1. Global Support + 20 (Buff, Target: AllAllies, Attribute: Support)
        const supporterB = {
            name: 'SupporterB',
            stats: { Support: 100 },
            skills: [
                {
                    name: 'GlobalSupportBuff',
                    levels: [
                        {
                            level: '10',
                            description: null,
                            effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Support', value: 20 }]
                        }
                    ]
                }
            ]
        } as unknown as ParsedCharacterData;

        // Calculation:
        // Supporter A Base Support: 100
        // buffs on A:
        //   - Self Buff: +50
        //   - Global Buff from B: +20
        //   - Total Support Power: 100 + 50 + 20 = 170.
        // Supporter A Scaling Buff:
        //   - 100% of 170 = 170% Attack Increase to Attacker.

        // Supporter B Base Support: 100
        // buffs on B: 
        //   - Global Buff from B (AllAllies includes Self): +20 
        //   (Wait, does AllAllies from B apply to B? Usually yes in this logic so far).
        //   - Total Support Power B: 120. (Irrelevant for Attacker since B has no scaling skill).

        const result = calculateMaxBuffs(attacker, [supporterA, supporterB]);

        expect(result.attackIncreasePercent).toBe(170);
    });

    // 15. Test getStackableSkills logic
    describe('getStackableSkills', () => {

        const character = {
            name: 'StackChar',
            skills: [
                {
                    name: 'Skill1', // Stackable at Lv10
                    levels: [
                        { level: '1', description: null, effects: [{ type: 'Buff', target: 'Self', attribute: 'Attack', value: 10 }] },
                        { level: '10', description: null, effects: [{ type: 'Buff', target: 'Self', attribute: 'Attack', value: 20, isStackable: true }] }
                    ]
                },
                {
                    name: 'Skill2', // Never stackable
                    levels: [
                        { level: '10', description: null, effects: [{ type: 'Buff', target: 'Self', attribute: 'Attack', value: 10 }] }
                    ]
                },
                {
                    name: 'Skill3', // Stackable only on Ex
                    levels: [
                        { level: '10', description: null, effects: [{ type: 'Buff', target: 'Self', attribute: 'Attack', value: 10 }] },
                        { level: 'Ex', description: null, effects: [{ type: 'Buff', target: 'Self', attribute: 'Attack', value: 30, isStackable: true }] }
                    ]
                }
            ]
        } as unknown as ParsedCharacterData;

        it('should return skills that are stackable at the active level', () => {
            // Default level is max (10) -> Skill1 is stackable
            const result = getStackableSkills(character, {}, {});
            expect(result.map(s => s.name)).toContain('Skill1');
            expect(result.map(s => s.name)).not.toContain('Skill2');

            // Skill3 is NOT stackable at level 10 (Ex default enabled? logic says Ex is checked if enabled. Ex default is true.)
            // Logic says if Ex is enabled, we check BOTH effective level AND Ex.
            // Skill3 has stackable at Ex. So it should be included if Ex is enabled.
            expect(result.map(s => s.name)).toContain('Skill3');
        });

        it('should NOT return Skill1 if active level is 1 (not stackable)', () => {
            const result = getStackableSkills(character, { 'StackChar': '1' }, {});
            expect(result.map(s => s.name)).not.toContain('Skill1');
        });

        it('should NOT return Skill3 if Ex is disabled', () => {
            const result = getStackableSkills(character, {}, { 'StackChar': false });
            expect(result.map(s => s.name)).not.toContain('Skill3');
        });
    });

    // 16. Test stackCount in modifiers
    it('should include stackCount in modifiers for stackable skills', () => {
        const attacker = createChar('StackAttacker', [
            { type: 'Buff', target: 'Self', attribute: 'Attack', value: 10, isStackable: true }
        ]);

        // 1. Stack Count = 3
        // Note: createChar uses 'Test Skill' as the default skill name.
        // And logic uses skill.name as key.
        let result = calculateMaxBuffs(attacker, [], { 'Test Skill': 3 });
        let modifier = result.modifiers.find(m => m.skillName === 'Test Skill');
        expect(modifier).toBeDefined();
        expect(modifier?.value).toBe(30); // 10 * 3
        expect(modifier?.stackCount).toBe(3);

        // 2. Stack Count = 1 (Default or explicit)
        result = calculateMaxBuffs(attacker, [], { 'Test Skill': 1 });
        modifier = result.modifiers.find(m => m.skillName === 'Test Skill');
        expect(modifier).toBeDefined();
        expect(modifier?.value).toBe(10);
        expect(modifier?.stackCount).toBe(1);

        // 3. Non-stackable skill
        const nonStack_attacker = createChar('NormalAttacker', [
            { type: 'Buff', target: 'Self', attribute: 'Attack', value: 10 } // isStackable undefined/false
        ]);
        result = calculateMaxBuffs(nonStack_attacker, []);
        modifier = result.modifiers.find(m => m.skillName === 'Test Skill');
        expect(modifier).toBeDefined();
        expect(modifier?.stackCount).toBeUndefined();
    });

    // 13. [Bug Repro] Verify that 'Support' stat is used for SupportScaling, not 'Attack'
    it('should use Support stat for SupportScaling, NOT Attack stat', () => {
        const attacker = createChar('Attacker', [], { critRate: 0 });

        // Manual creation of Suporther with explicit 'Support' stat (and NO 'Attack' stat)
        // Mimicking what wikiParser produces for Supporters
        const supporter: ParsedCharacterData = {
            name: 'RealSupporter',
            // @ts-ignore - explicitly testing missing attack 
            stats: {
                Support: 1000,
                // Attack is deliberately missing or 0
                hp: 100, defense: 10, critRate: 0, critDamage: 0, speed: 0
            },
            skills: [
                {
                    name: 'Support Skill',
                    levels: [{
                        level: '1',
                        description: null,
                        effects: [{
                            type: 'Buff',
                            attribute: 'CritRate',
                            value: 10, // 10% scaling
                            calculationType: 'SupportScaling',
                            target: 'AllAllies'
                        }]
                    }]
                }
            ]
        };

        const result = calculateMaxBuffs(attacker, [supporter]);

        // 1000 * 10% = 100
        expect(result.critRateTotal).toBe(100);
    });

    // 17. Verify Hyper Crit Damage separation
    it('should correctly calculate and separate Hyper Crit Damage', () => {
        const attacker = createChar('Attacker', [], { critDamage: 150 });
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'CritDamage', value: 30, target: 'AllAllies' },
            { type: 'Buff', attribute: 'HyperCritDamage', value: 50, target: 'AllAllies' }
        ]);

        const result = calculateMaxBuffs(attacker, [supporter]);

        // Base: 150
        // CritDamage Buff: 30
        // HyperCritDamage Buff: 50
        // Total CritDamage: 150 + 30 + 50 = 230
        expect(result.critDamageTotal).toBe(230);

        // Check new property
        expect(result.hyperCritDamageBuff).toBe(50);

        // Verify modifiers
        const hyperMod = result.modifiers.find(m => m.attribute === 'HyperCritDamage');
        expect(hyperMod).toBeDefined();
        expect(hyperMod?.value).toBe(50);
    });

    // 18. Test Description Fallback
    it('should fallback to previous level description if current level description is missing', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });
        const supporter = {
            name: 'Supporter',
            stats: { Support: 100 },
            skills: [
                {
                    name: 'FallbackSkill',
                    levels: [
                        // Level 1: Has description
                        {
                            level: '1',
                            description: 'Level 1 Description',
                            effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 10 }]
                        },
                        // Level 5: Has different description
                        {
                            level: '5',
                            description: 'Level 5 Description',
                            effects: [{ type: 'Buff', target: 'AllAllies', attribute: 'Attack', value: 15 }]
                        }
                        // Level 10: No description (null or undefined
                    ]
                }
            ]
        } as unknown as ParsedCharacterData;

        // 1. Test at Level 10 (Should use Level 5 Description)
        const resLv10 = calculateMaxBuffs(attacker, [supporter], {}, {}, { 'Supporter': '10' });
        const modLv10 = resLv10.modifiers.find(m => m.skillName === 'FallbackSkill');
        expect(modLv10?.description).toBe('Level 5 Description');

        // 2. Test at Level 5 (Should use Level 5 Description)
        const resLv5 = calculateMaxBuffs(attacker, [supporter], {}, {}, { 'Supporter': '5' });
        const modLv5 = resLv5.modifiers.find(m => m.skillName === 'FallbackSkill');
        expect(modLv5?.description).toBe('Level 5 Description');

        // 3. Test at Level 1 (Should use Level 1 Description)
        const resLv1 = calculateMaxBuffs(attacker, [supporter], {}, {}, { 'Supporter': '1' });
        const modLv1 = resLv1.modifiers.find(m => m.skillName === 'FallbackSkill');
        expect(modLv1?.description).toBe('Level 1 Description');

        // 4. Test at Level 4 (Should use Level 1 Description)
        const resLv4 = calculateMaxBuffs(attacker, [supporter], {}, {}, { 'Supporter': '4' });
        const modLv4 = resLv4.modifiers.find(m => m.skillName === 'FallbackSkill');
        expect(modLv4?.description).toBe('Level 1 Description');
    });
});
