// @vitest-environment jsdom
import { describe, it, expect } from 'vitest';
import { parseSkillDescription } from '../src/logic/wikiParser';

describe('wikiParser - Target Detection (parseSkillDescription)', () => {

    it('should detect "Self" target (自身の)', () => {
        const description = '自身の【攻撃力】を30%上昇(1ターン持続)';
        const effects = parseSkillDescription(description);
        const effect = effects[0];

        expect(effect.target).toBe('Self');
        expect(effect.attribute).toBe('Attack');
        expect(effect.value).toBe(30);
    });

    it('should detect "All Allies" target (味方全員)', () => {
        const description = '味方全員の【防御力】を20%上昇(2ターン持続)';
        const effects = parseSkillDescription(description);
        const effect = effects[0];

        expect(effect.target).toBe('AllAllies');
        expect(effect.attribute).toBe('Armor');
        expect(effect.value).toBe(20);
    });

    it('should detect "All Allies" target (すべての味方)', () => {
        const description = 'すべての味方の【機動力】を10%上昇(永続)';
        const effects = parseSkillDescription(description);
        const effect = effects[0];

        expect(effect.target).toBe('AllAllies');
        expect(effect.attribute).toBe('Mobility');
        expect(effect.value).toBe(10);
    });

    it('should default to "Default" if no target specified', () => {
        const description = '敵単体にダメージを与える/【攻撃力】を10%低下(1ターン持続)';
        const effects = parseSkillDescription(description);
        const effect = effects[0];

        expect(effect.target).toBe('Default');
    });

    it('should handle multiple sentences with different targets', () => {
        // First sentence: Self Attack Up. Second sentence: Default (Enemy) Armor Down.
        const description = '自身の【攻撃力】を30%上昇(1ターン持続)。敵単体の【装甲】を20%低下(1ターン持続)';
        const effects = parseSkillDescription(description);

        expect(effects).toHaveLength(2);

        const selfEffect = effects.find(e => e.attribute === 'Attack');
        expect(selfEffect?.target).toBe('Self');

        const enemyEffect = effects.find(e => e.attribute === 'Armor');
        expect(enemyEffect?.target).toBe('Default');
    });

    it('should apply target from previous sentence if ambiguous BUT reset if new sentence has no target? Logic: resets on new sentence unless carried over by pending (which resets on duration)', () => {
        // Logic check:
        // 1. "自身...". Found target 'Self'. Found duration. Resolved. lastDuration set.
        // 2. "...". No target found. lastTarget is 'Self' (it persists for the whole description actually?). 
        // Wait, `lastTarget` is scoped to `parseSkillDescription`.
        // It is updated `if (foundTarget) { lastTarget = target; }`. 
        // So if a sentence *doesn't* have a target, `lastTarget` remains whatever it was.
        // This implies "Sentence 1: Self. Sentence 2: [Implicitly Self]".

        const description = '自身の【攻撃力】を30%上昇(1ターン持続)。【クリティカル率】を20%上昇(1ターン持続)';
        const effects = parseSkillDescription(description);

        const critEffect = effects.find(e => e.attribute === 'CritRate');
        expect(critEffect?.target).toBe('Self');
    });
    it('should detect "All Allies" target even if "Self" is present in condition (♦究極審問)', () => {
        const description = '♦究極審問!自身行動前、味方が2名かそれ以上戦闘不能となった場合、すべての味方の攻撃力が支援力×60%、会心ダメージが支援力×80%アップし、18ターン持続する。';
        const effects = parseSkillDescription(description);

        expect(effects.length).toBeGreaterThan(0);
        effects.forEach(effect => {
            expect(effect.target).toBe('AllAllies');
        });

        const attackEffect = effects.find(e => e.attribute === 'Attack');
        expect(attackEffect).toBeDefined();
        expect(attackEffect?.value).toBe(60);
        expect(attackEffect?.calculationType).toBe('SupportScaling');

        const critEffect = effects.find(e => e.attribute === 'CritDamage');
        expect(critEffect).toBeDefined();
        expect(critEffect?.value).toBe(80);
    });
});
