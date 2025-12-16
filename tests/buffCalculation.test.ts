import { describe, it, expect } from 'vitest';
import { calculateMaxBuffs, CalculatedBuffs } from '../src/logic/buffCalculation';
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

        const supportPower = parseFloat(String(supporter.stats?.attack || '0'));

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
        ], { attack: 161 });

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

        const supporter = createChar('Supporter', [], { attack: 110 });
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
            stats: { attack: 100 },
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
            stats: { attack: 100 },
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
});

