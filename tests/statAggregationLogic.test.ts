
// @vitest-environment jsdom
import { describe, it, expect, vi } from 'vitest';
import { parseCharacterData } from '../src/logic/wikiParser';
import * as wikiParser from '../src/logic/wikiParser';

// We will mock the parser functions to return controlled data
// ensuring we isolate the aggregation logic in parseCharacterData.

describe('Stat Aggregation Logic', () => {
    // Helper to mock internal parsers
    const setupMocks = (
        baseStats: any,
        awakenStats: any = {},
        bondStats: any = {},
        equipStats: any = {},
        role: string = 'Attacker'
    ) => {
        // Mocking fs/dom parsing isn't needed if we mock the sub-functions.
        // However, parseCharacterData calls them internally.
        // We need to spy on them.

        // Since parseCharacterData is in the same module, mocking locally might be tricky 
        // if they are not exported or if the module calls them directly (which it does).
        // A better approach for integration testing `parseCharacterData` without full HTML 
        // is to construct a minimal HTML that yields these values, 
        // OR rely on the fact that we can't easily mock internal calls in the same module with esbuild/vitest 
        // without some rewiring.

        // Alternative: Verify with specific HTML snippets that we know produce specific outputs.
        // Or simply trust the full integration test with Iria if possible.
        // But we want "Unit tests for each".

        // Let's create a minimal HTML that the parser can read.
        return `
            <html>
                <body>
                    <!-- Basic Info -->
                    <div id="wikibody">
                        <table>
                            <thead><tr><th>キャラクター名称</th><th>タイプ</th></tr></thead>
                            <tbody><tr><td>TestChar</td><td>${role === 'Supporter' ? '支援' : '超越'}</td></tr></tbody>
                        </table>

                        <!-- Base Stats Table (Table 1 or 2 usually) -->
                        <div class="table_style_data" data-table_class="table_style_2"></div>
                        <table class="atwiki_table_color">
                            <thead><tr><th>HP 機動力 Lv</th></tr></thead> <!-- Required header text -->
                            <tbody>
                                <tr>
                                    <td>Name</td> <!-- 0 -->
                                    <td>Type</td> <!-- 1 -->
                                    <td>Stars</td> <!-- 2 -->
                                    <td>Lv100</td> <!-- 3 (Must verify index, typically Max Row logic) -->
                                    <td>${baseStats.hp || 0}</td> <!-- 4: HP -->
                                    <td>${baseStats.attack || 0}</td> <!-- 5: Attack -->
                                    <td>${baseStats.defense || 0}</td> <!-- 6: Armor -->
                                    <td>${baseStats.critRate || 0}</td> <!-- 7: CritRate -->
                                    <td>${baseStats.critDamage || 0}</td> <!-- 8: CritDamage -->
                                    <td>${baseStats.speed || 0}</td> <!-- 9: Mobility -->
                                    <td>Awake</td> <!-- 10 -->
                                </tr>
                            </tbody>
                        </table>

                         <!-- Awakening Table (Table 4) -->
                         <div class="table_style_data" data-table_class="table_style_4"></div>
                         <table class="atwiki_table_color">
                            <thead><tr><th>覚醒時ステータス</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>
                                        ${awakenStats.hp ? `HP+${awakenStats.hp}` : ''}
                                        ${awakenStats.attack ? `攻撃力+${awakenStats.attack}` : ''}
                                        ${awakenStats.support ? `支援力+${awakenStats.support}` : ''}
                                    </td>
                                </tr>
                            </tbody>
                         </table>

                         <!-- Bond Table (Table 5) -->
                         <div class="table_style_data" data-table_class="table_style_5"></div>
                         <table class="atwiki_table_color">
                            <thead><tr><th>好感度 ステータス</th></tr></thead>
                            <tbody>
                                <tr>
                                    <td>10</td> <!-- Max Level -->
                                    <td>
                                        ${[
                bondStats.armor ? `装甲+${bondStats.armor}%` : '',
                bondStats.mobility ? `機動力+${bondStats.mobility}%` : '',
                bondStats.critRate ? `会心率+${bondStats.critRate}%` : ''
            ].filter(Boolean).join(',')}
                                    </td>
                                </tr>
                            </tbody>
                         </table>

                         <!-- Equipment Table (Table 8) -->
                         <div class="table_style_data" data-table_class="table_style_8"></div>
                         <table class="atwiki_table_color">
                             <thead><tr><th>装備1 装備2</th></tr></thead>
                             <tbody>
                                 <tr>
                                    <td>
                                        ${[
                equipStats.attack ? `攻撃力+${equipStats.attack}%` : '',
                equipStats.hp ? `HP+${equipStats.hp}%` : '',
                equipStats.mobility ? `機動力+${equipStats.mobility}%` : '',
                equipStats.critDamage ? `会心ダメージ+${equipStats.critDamage}%` : ''
            ].filter(Boolean).join(' ')}
                                    </td>
                                 </tr>
                             </tbody>
                         </table>
                    </div>
                </body>
            </html>
        `;
    };

    it('should treat Armor % as Additive', () => {
        // Base Armor 20. Bond +10%. 
        // Additive: 20 + 10 = 30.
        // Multiplicative: 20 * 1.1 = 22. is wrong.
        const html = setupMocks({ defense: 20 }, {}, { armor: 10 });
        const data = parseCharacterData(html);
        const stats = data.stats as any;
        expect(stats.Armor).toBe(30);
    });

    it('should treat Mobility % as Additive', () => {
        // Base Mobility 50. Equip +20%.
        // Additive: 50 + 20 = 70.
        // Multiplicative: 50 * 1.2 = 60. is wrong.
        const html = setupMocks({ speed: 50 }, {}, {}, { mobility: 20 });
        const data = parseCharacterData(html);
        const stats = data.stats as any;
        expect(stats.Mobility).toBe(70);
    });

    it('should treat CritRate % as Additive', () => {
        // Base CritRate 15. Bond +10%.
        // Additive: 15 + 10 = 25.
        // Multiplicative: 15 * 1.1 = 16.5 -> 17. is wrong.
        const html = setupMocks({ critRate: 15 }, {}, { critRate: 10 });
        const data = parseCharacterData(html);
        const stats = data.stats as any;
        expect(stats.CritRate).toBe(25);
    });

    it('should treat CritDamage % as Additive', () => {
        // Base CritDamage 150. Equip +30%.
        // Additive: 150 + 30 = 180.
        // Multiplicative: 150 * 1.3 = 195. is wrong.
        const html = setupMocks({ critDamage: 150 }, {}, {}, { critDamage: 30 });
        const data = parseCharacterData(html);
        const stats = data.stats as any;
        expect(stats.CritDamage).toBe(180);
    });

    it('should treat HP % as Multiplicative (Value)', () => {
        // Base HP 1000. Awaken +100. Equip +20%.
        // (1000 + 100) * 1.2 = 1320.
        // Additive check: 1000+100 + 20 = 1120. is wrong.
        const html = setupMocks({ hp: 1000 }, { hp: 100 }, {}, { hp: 20 });
        const data = parseCharacterData(html);
        const stats = data.stats as any;
        expect(stats.Hp).toBe(1320);
    });

    it('should treat Attack % as Multiplicative (Value)', () => {
        // Base Attack 100. Equip +10%.
        // Value: 100 * 1.1 = 110.
        // Rate (Additive): 100 + 10 = 110.
        // Ambiguous. Use larger value.
        // Base 500. Equip +10%.
        // Value: 550.
        // Rate: 500 + 10 = 510. is wrong.
        const html = setupMocks({ attack: 500 }, {}, {}, { attack: 10 });
        const data = parseCharacterData(html);
        const stats = data.stats as any;
        expect(stats.Attack).toBe(550);
    });
});
