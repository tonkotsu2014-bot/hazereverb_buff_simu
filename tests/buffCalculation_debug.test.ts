import { describe, it, expect } from 'vitest';
import { calculateMaxBuffs, CalculatedBuffs } from '../src/logic/buffCalculation';
import { ParsedCharacterData } from '../src/logic/wikiParser';

/**
 * 仕様: デバッグ情報とAction定義の拡充
 *
 * 1. 自己バフのAction化 (Self-Support Mods)
 *    - 従来、支援キャラクター自身の「支援力アップ（attribute: Support）」は内部ステータス計算のみに使用され、
 *      Actionリスト（modifiers）には含まれていなかった。
 *    - 今回の修正で、この自己バフも `BuffModifier` として記録し、Actionリストに追加する仕様に変更。
 *    - これにより、ユーザーはUI上で「自己バフが発動しているか」「値はいくつか」を確認可能になる。
 *    - `calculationType` には `'Fixed (Self)'` が設定される。
 *
 * 2. スケーリング計算のデバッグ詳細 (Scaling Debug Info)
 *    - `SupportScaling`（支援力依存）および `SilentScaling`（サイレント数依存）のバフ計算において、
 *      計算根拠となる内部数値を `BuffModifier` に追加プロパティとして保持する。
 *      - `scalingBase`: 計算の基礎値（支援スケーリングなら「支援力(%)」、サイレントスケーリングなら「サイレントバフ数」）。
 *      - `scalingFactor`: スキル効果値としての倍率（例: 支援力の「20%」なら 20）。
 *    - これにより、最終的なバフ値だけでなく、「元の支援力がいくつで、何倍された結果なのか」をUIで表示・確認可能にする。
 *
 * 3. Global Support Buff の扱い
 *    - 他者からの「全体支援力アップ」などのバフも、Actionリストに含まれることを保証する。
 */

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
                        level: '10',
                        description: null,
                        effects: effects
                    }
                ]
            }
        ]
    };
};

describe('calculateMaxBuffs Debug Info', () => {

    it('should include debug info for self-support buffs', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });
        const supporter = createChar('Supporter', [
            // Self Support Buff
            { type: 'Buff', attribute: 'Support', value: 50, target: 'Self' }
        ], { Support: 100 });

        const result = calculateMaxBuffs(attacker, [supporter]);

        const selfBuffMod = result.modifiers.find(m =>
            m.sourceCharacterName === 'Supporter' &&
            m.attribute === 'Support' &&
            m.target === undefined // Target is not on modifier, logic adds it based on context? No, modifier structure doesn't have target.
            // But we know it's the self buff because of attribute 'Support'
        );

        expect(selfBuffMod).toBeDefined();
        expect(selfBuffMod?.value).toBe(50);
        expect(selfBuffMod?.calculationType).toBe('Fixed (Self)');
    });

    it('should include scalingBase and scalingFactor for SupportScaling buffs', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });

        // Supporter with Base Support 100 + Self Buff 50 = Effective Support 150
        // Skill scales 100% of Support to Attack
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Support', value: 50, target: 'Self' },
            { type: 'Buff', attribute: 'Attack', value: 100, calculationType: 'SupportScaling', target: 'AllAllies' }
        ], { Support: 100 });

        const result = calculateMaxBuffs(attacker, [supporter]);

        const scalingMod = result.modifiers.find(m =>
            m.sourceCharacterName === 'Supporter' &&
            m.attribute === 'Attack' &&
            m.calculationType === 'SupportScaling'
        );

        expect(scalingMod).toBeDefined();
        // Base Support used for scaling should be 150 (100 base + 50 self buff)
        expect(scalingMod?.scalingBase).toBe(150);
        // Factor is 100%
        expect(scalingMod?.scalingFactor).toBe(100);
        // Result Value: 150 * (100/100) = 150
        expect(scalingMod?.value).toBe(150);
    });

    it('should include scalingBase for SilentScaling buffs', () => {
        // Silent Scaling depends on 'Silent' attribute buffs count.
        // Let's create an attacker that HAS a silent buff.
        // And a supporter that scales off silent count.

        // Actually silent count logic counts how many Silent buffs the CHARACTER (Attacker or Supporter) has active.
        // If calculationType is SilentScaling, it multiplies effect value by silent count.

        // Let's assume Supporter has a Silent Buff on self, and a skill that scales with Silent count.
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Silent', value: 1, target: 'Self' }, // Silent Buff
            { type: 'Buff', attribute: 'Attack', value: 10, calculationType: 'SilentScaling', target: 'AllAllies' } // Scales 10 per silent
        ], { Support: 100 });

        const attacker = createChar('Attacker', [], { attack: 1000 });

        const result = calculateMaxBuffs(attacker, [supporter]);

        const scalingMod = result.modifiers.find(m =>
            m.sourceCharacterName === 'Supporter' &&
            m.attribute === 'Attack' &&
            m.calculationType === 'SilentScaling'
        );

        expect(scalingMod).toBeDefined();
        // Silent Count should be 1 (from the first effect)
        expect(scalingMod?.scalingBase).toBe(1); // scalingBase for SilentScaling stores the count
        expect(scalingMod?.scalingFactor).toBe(10); // Factor stores the per-stack value
        expect(scalingMod?.value).toBe(10); // 1 * 10
    });

    it('should collect self-buffs as active modifiers in the result list', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Support', value: 20, target: 'Self' }
        ], { Support: 100 });

        const result = calculateMaxBuffs(attacker, [supporter]);

        // Check that modifiers list contains the self buff
        const selfSupportMod = result.modifiers.find(m => m.attribute === 'Support');
        expect(selfSupportMod).toBeDefined();
        expect(selfSupportMod?.isActive).toBe(true);
        expect(selfSupportMod?.sourceCharacterName).toBe('Supporter');
    });

    it('should correctly handle Stackable Self-Support buffs', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Support', value: 10, target: 'Self', isStackable: true }
        ], { Support: 100 });

        // Apply 3 stacks
        const result = calculateMaxBuffs(attacker, [supporter], { 'Test Skill': 3 });

        const selfBuffMod = result.modifiers.find(m => m.attribute === 'Support');

        expect(selfBuffMod).toBeDefined();
        // 10 * 3 = 30
        expect(selfBuffMod?.value).toBe(30);
        expect(selfBuffMod?.stackCount).toBe(3);
    });

    it('should NOT include Self-Support buffs if the Ex skill is disabled', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });
        // Supporter with Ex skill giving Self Support buff
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Support', value: 50, target: 'Self' }
        ], { Support: 100 });

        // Mock Ex level
        (supporter.skills[0].levels[0] as any).level = 'Ex';

        // Disable Ex for Supporter
        const result = calculateMaxBuffs(attacker, [supporter], {}, { 'Supporter': false });

        const selfBuffMod = result.modifiers.find(m => m.attribute === 'Support');
        expect(selfBuffMod).toBeUndefined();
    });

    it('should include Global Support Buffs (Supporter -> Supporter/All) in modifiers list', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });

        // Supporter A gives Global Support Buff to All Allies
        const supporterA = createChar('SupporterA', [
            { type: 'Buff', attribute: 'Support', value: 20, target: 'AllAllies' }
        ], { Support: 100 });

        // Supporter B receives it (and does nothing else)
        const supporterB = createChar('SupporterB', [], { Support: 100 });

        const result = calculateMaxBuffs(attacker, [supporterA, supporterB]);

        // Access modifier list
        // Global Support Buffs are calculated in step 0, AND they are also processed in Step 2 loop 
        // because they target 'AllAllies' (which includes Attacker contextually in the loop).
        // So checking modifiers list should find it.

        const globalMod = result.modifiers.find(m =>
            m.sourceCharacterName === 'SupporterA' &&
            m.attribute === 'Support'
        );

        expect(globalMod).toBeDefined();
        expect(globalMod?.value).toBe(20);
    });

    it('should allow toggling off Self-Support buffs', () => {
        const attacker = createChar('Attacker', [], { attack: 1000 });
        // Supporter with Base Support 100.
        // Self Buff +50 (Support).
        // Skill scales 100% Support to Attack.
        const supporter = createChar('Supporter', [
            { type: 'Buff', attribute: 'Support', value: 50, target: 'Self' },
            { type: 'Buff', attribute: 'Attack', value: 100, calculationType: 'SupportScaling', target: 'AllAllies' }
        ], { Support: 100 });

        // 1. Default (Active)
        // Effective Support = 100 + 50 = 150.
        // Attack Buff = 150 * 100% = 150.
        const resultActive = calculateMaxBuffs(attacker, [supporter]);
        const selfBuffMod = resultActive.modifiers.find(m => m.attribute === 'Support');

        expect(selfBuffMod).toBeDefined();
        expect(selfBuffMod?.isActive).toBe(true);
        const scalingBuffActive = resultActive.modifiers.find(m => m.calculationType === 'SupportScaling');
        expect(scalingBuffActive?.value).toBe(150);

        // 2. Disabled
        // ID construction: CharName-SkillName-Attribute-Type
        // CharName: Supporter
        // SkillName: Test Skill
        // Attribute: Support
        // Type: Buff
        const buffId = 'Supporter-Test Skill-Support-Buff';

        const disabledSet = new Set([buffId]);
        const resultDisabled = calculateMaxBuffs(attacker, [supporter], {}, {}, {}, disabledSet);

        const selfBuffModDisabled = resultDisabled.modifiers.find(m => m.attribute === 'Support');
        expect(selfBuffModDisabled?.isActive).toBe(false);

        // Effective Support should now be Base (100) only.
        // Scaling Buff = 100 * 100% = 100.
        const scalingBuffDisabled = resultDisabled.modifiers.find(m => m.calculationType === 'SupportScaling');
        expect(scalingBuffDisabled?.value).toBe(100);
    });

});
