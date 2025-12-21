
import { describe, test, expect } from 'vitest';
import { simulateTurns, CharacterState } from '../src/logic/turnSimulator';
import { ParsedCharacterData } from '../src/logic/wikiParser';
import fs from 'fs';
import path from 'path';

// Load test characters
const testCharactersPath = path.join(__dirname, 'data', 'test_characters.json');
const testCharacters: ParsedCharacterData[] = JSON.parse(fs.readFileSync(testCharactersPath, 'utf-8'));

describe('Course Guard Passive Skill Reproduction', () => {

    test('Course Guard skill 2 should apply CritDamage buff to ALL allies', () => {
        // Find Course Guard
        const courseGuardData = testCharacters.find(c => c.name === '清浄の騎士 コースガード');
        if (!courseGuardData) throw new Error('Course Guard not found in test data');

        // Find another character (e.g., Veril)
        const verilData = testCharacters.find(c => c.name === '不安定化合物 ヴェリル');
        if (!verilData) throw new Error('Veril not found in test data');


        // Setup Party
        // Course Guard uses Skill 2 (Index 2 in skills array usually, but let's check by name)
        // Skill 2 name is "スキル2/天険のごとく"
        // At level 10 it gives: "毎ラウンド開始時に、すべての味方のクリティカルダメージが50%増加する。"

        const courseGuard = {
            ...courseGuardData,
            id: 'course_guard',
            skills: courseGuardData.skills.map(s => {
                if (s.name === 'スキル2/天険のごとく') {
                    // Manually inject effects here as well
                    const sCopy = { ...s, activeLevel: '10' };
                    // We need to mutate the LEVELS of this copy to have the effects
                    const level10Index = sCopy.levels.findIndex(l => l.level === '10');
                    if (level10Index !== -1) {
                        const newLevels = [...sCopy.levels];
                        newLevels[level10Index] = {
                            ...newLevels[level10Index],
                            effects: [
                                {
                                    attribute: 'DamageReduction',
                                    value: 165,
                                    type: 'Buff',
                                    target: 'Self',
                                    duration: 12,
                                    calculationType: 'Fixed',
                                    isStackable: true
                                },
                                {
                                    attribute: 'CritDamage',
                                    value: 50,
                                    type: 'Buff',
                                    target: 'AllAllies',
                                    duration: 18,
                                    calculationType: 'Fixed',
                                    isStackable: true
                                }
                            ]
                        };
                        sCopy.levels = newLevels;
                    }
                    return sCopy;
                }
                return s;
            })
        };

        const veril = {
            ...verilData,
            id: 'veril',
            skills: verilData.skills.map(s => {
                if (s.name === 'スキル2/双極ブレインウェーブ') {
                    return { ...s, activeLevel: '1' };
                }
                return s;
            })
        };

        const party = [courseGuard, veril];

        // Fix: simulateTurns takes (party, maxRounds)
        const results = simulateTurns(party, 1);

        // Let's get the last state of Veril in Round 1
        const round1Actions = results.filter(r => r.round === 1);
        const lastAction = round1Actions[round1Actions.length - 1];
        const verilState = lastAction.characterStates.find((_, idx) => party[idx].id === 'veril');

        if (!verilState) throw new Error('Veril state not found');

        // Check for CritDamage buff
        // The effect value is 50% (from Level 10 description)

        const critDamageBuffs = verilState.receivedSkills.flatMap(s => s.effects).filter(e => e.attribute === 'CritDamage');
        const totalCritDamageBuff = critDamageBuffs.reduce((sum, e) => sum + e.value, 0);

        // Expectation: Should be 50
        expect(totalCritDamageBuff).toBeGreaterThanOrEqual(50);
    });
});
