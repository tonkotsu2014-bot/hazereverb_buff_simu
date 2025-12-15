// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { determineEffectType } from '../src/logic/wikiParser';

describe('wikiParser - Effect Type Parsing (determineEffectType)', () => {
    it('should identify "Buff" verbs', () => {
        expect(determineEffectType('増加')).toBe('Buff');
        expect(determineEffectType('上昇')).toBe('Buff');
        expect(determineEffectType('アップ')).toBe('Buff');
    });

    it('should identify "Debuff" verbs', () => {
        expect(determineEffectType('低下')).toBe('Debuff');
        expect(determineEffectType('減少')).toBe('Debuff');
        expect(determineEffectType('ダウン')).toBe('Debuff');
    });

    it('should default to "Buff" for unknown verbs (implementation detail)', () => {
        // Current implementation is: ['低下', '減少', 'ダウン'].includes(verb) ? 'Debuff' : 'Buff';
        expect(determineEffectType('獲得')).toBe('Buff');
        expect(determineEffectType('回復')).toBe('Buff');
    });
});

import { parseSkillDescription } from '../src/logic/wikiParser';

describe('wikiParser - Complex Description Integration', () => {
    it('should parse duration and effect type from complex string with noise and separate duration sentence', () => {
        const desc = '♦攻撃アシスト 強化 バフ ターゲットの攻撃力が支援力×15%増加する。これは18ターン持続する。';
        const effects = parseSkillDescription(desc);

        expect(effects).toHaveLength(1);
        const effect = effects[0];

        expect(effect.type).toBe('Buff');
        expect(effect.attribute).toBe('Attack'); // ターゲットの攻撃力 -> Attack
        expect(effect.value).toBe(15);
        expect(effect.duration).toBe(18);
        expect(effect.calculationType).toBe('SupportScaling'); // 支援力×...
    });

    it('should parse complex description with internal spaces in attribute', () => {
        const desc = '出力増幅 強化   バフ   毎ラウンド開始時に、すべての味方のクリティカルダメージが50%増加する。これは  18ターン持続する。';
        const effects = parseSkillDescription(desc);

        expect(effects).toHaveLength(1);
        const effect = effects[0];

        expect(effect.type).toBe('Buff');
        expect(effect.target).toBe('AllAllies'); // すべての味方の...
        expect(effect.attribute).toBe('CritDamage'); // クリ  ティカルダメージ
        expect(effect.value).toBe(50);
    });

    // 無関係なスキルの場合のテスト
    it('should return undefined if no effect type found', () => {
        const desc = '♦コア出力 ダメージ 追加 通常攻撃後、ターゲットにターゲットにかかっているバフスキル効果の数×攻撃力×35%の固定ダメージを与える。';
        const effects = parseSkillDescription(desc);

        expect(effects).toHaveLength(0);
    });
});


