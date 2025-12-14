// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { splitSkillDescription } from '../src/logic/wikiParser';

describe('wikiParser - Description Splitting (splitSkillDescription)', () => {
    it('should split by Japanese period (。)', () => {
        const input = '攻撃力が上がる。防御力が下がる。';
        const expected = ['攻撃力が上がる。防御力が下がる。'];
        expect(splitSkillDescription(input)).toEqual(expected);
    });

    it('should split by newline', () => {
        const input = '攻撃力が上がる\n防御力が下がる';
        const expected = ['攻撃力が上がる', '防御力が下がる'];
        expect(splitSkillDescription(input)).toEqual(expected);
    });

    it('should split by mixed period and newline', () => {
        const input = '攻撃力が上がる。\n防御力が下がる。';
        const expected = ['攻撃力が上がる。', '防御力が下がる。'];
        expect(splitSkillDescription(input)).toEqual(expected);
    });

    it('should ignore empty segments', () => {
        const input = '攻撃力が上がる。。防御力が下がる';
        const expected = ['攻撃力が上がる。。防御力が下がる'];
        expect(splitSkillDescription(input)).toEqual(expected);
    });

    it('should trim whitespace', () => {
        const input = '  攻撃力が上がる  。  防御力が下がる  ';
        const expected = ['攻撃力が上がる  。  防御力が下がる'];
        expect(splitSkillDescription(input)).toEqual(expected);
    });

    // Real world examples
    it('should handle real skill description (Monika Ex)', () => {
        // "すべての味方の攻撃力が支援力×60%、会心ダメージが支援力×80%アップし、18ターン持続する。"
        // This is actually one sentence usually, but if it had periods:
        const input = 'すべての味方の攻撃力が支援力×60%、会心ダメージが支援力×80%アップし、18ターン持続する。';
        const expected = ['すべての味方の攻撃力が支援力×60%、会心ダメージが支援力×80%アップし、18ターン持続する。'];
        expect(splitSkillDescription(input)).toEqual(expected);
    });

    it('should handle real skill description with two sentences (Iria Skill 4)', () => {
        // "自身の会心ダメージが30%増加する。18ターン持続する。"
        const input = '自身の会心ダメージが30%増加する。18ターン持続する。';
        const expected = ['自身の会心ダメージが30%増加する。18ターン持続する。'];
        expect(splitSkillDescription(input)).toEqual(expected);
    });

    it('should handle complex mixed content (User example)', () => {
        const input = '♦攻撃アシスト 強化   バフ   ターゲットの攻撃力が支援力×15%増加する。これは18ターン持続する。';
        const expected = [
            '♦攻撃アシスト 強化   バフ   ターゲットの攻撃力が支援力×15%増加する。これは18ターン持続する。'
        ];
        expect(splitSkillDescription(input)).toEqual(expected);
    });
    it('should handle complex mixed content(コースガード)', () => {
        const input = '♦防護障壁 軽減   バフ   毎ラウンド開始時に、自身のダメージ軽減率が115%増加する。これは12ターン持続する。♦出力増幅 強化   バフ   毎ラウンド開始時に、すべての味方のクリティカルダメージが30%増加する。これは18ターン持続する。';
        const expected = [
            '♦防護障壁 軽減   バフ   毎ラウンド開始時に、自身のダメージ軽減率が115%増加する。これは12ターン持続する。',
            '♦出力増幅 強化   バフ   毎ラウンド開始時に、すべての味方のクリティカルダメージが30%増加する。これは18ターン持続する。'
        ];
        expect(splitSkillDescription(input)).toEqual(expected);
    });
});
