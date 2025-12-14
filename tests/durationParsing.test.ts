// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseDuration } from '../src/logic/wikiParser';

describe('wikiParser - Duration Parsing (parseDuration)', () => {
    it('should return -1 for permanent duration (永続)', () => {
        expect(parseDuration('効果は永続する')).toBe(-1);
    });

    it('should parse "Xターン持続"', () => {
        expect(parseDuration('攻撃力が10%上昇(3ターン持続)')).toBe(3);
    });

    it('should parse "Xターンの間"', () => {
        expect(parseDuration('防御力が20%上昇(2ターンの間)')).toBe(2);
    });

    it('should return undefined if no duration found', () => {
        expect(parseDuration('コア出力・固 ダメージ 追加 自身の行動前に、自身の体力値が50%以下なら、ターゲットにターゲットにかかっているバフスキル効果の数×攻撃力×30%の固定ダメージを与える。')).toBeUndefined();
    });

    it('should prioritize explicit number over other text', () => {
        expect(parseDuration('10ターン持続')).toBe(10);
    });

    it('should parse duration from full multi-sentence string (user request)', () => {
        const desc = '♦攻撃アシスト 強化 バフ ターゲットの攻撃力が支援力×15%増加する。これは18ターン持続する。';
        expect(parseDuration(desc)).toBe(18);
    });

    it('should parse duration from full multi-sentence string (user request)', () => {
        const desc = '♦激発永続的にターゲットの装甲値を10%ダウンする。';
        expect(parseDuration(desc)).toBe(-1);
    });
});



