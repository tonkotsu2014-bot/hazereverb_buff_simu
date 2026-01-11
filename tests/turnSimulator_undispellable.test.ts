
import { describe, test, expect } from 'vitest';
import { simulateTurns, SimulationCharacter, Action } from '../src/logic/turnSimulator';
import { ICARUS } from '../src/logic/bossData';

describe('Turn Simulator - Undispellable Buffs & Icarus Dispel Logic', () => {
    // Helper to create a test character
    const createTestCharacter = (name: string, role: string, skillType: 'Buff' | 'Debuff', isUndispellable: boolean, target: 'Self' | 'AllAllies' = 'Self'): SimulationCharacter => {
        const typeStr = role === 'Supporter' ? '支援型' : '攻撃型';
        return {
            name,
            role,
            type: typeStr,
            skills: [
                {
                    name: 'TestSkill',
                    levels: [
                        {
                            level: '1',
                            description: null,
                            effects: [
                                {
                                    attribute: 'Attack',
                                    value: 50,
                                    type: skillType,
                                    duration: 3,
                                    target: target,
                                    isUndispellable: isUndispellable
                                }
                            ]
                        }
                    ],
                    activeLevel: '1'
                }
            ],
            stats: {
                HP: 1000, Attack: 100, Defense: 10, Speed: 100,
                Crit: 0, CritDmg: 0, Accuracy: 0, Evasion: 0,
                DebuffAccuracy: 0, DebuffResist: 0, Support: 100
            }
        };
    };

    test('Icarus should remove Supporter Buffs (normal)', () => {
        const character = createTestCharacter('SupBuff', 'Supporter', 'Buff', false);
        const party = [character];
        const maxRounds = 2;

        const actions = simulateTurns(party, maxRounds, ICARUS);

        // Find Boss Action in Round 1
        const bossActionIndex = actions.findIndex(a => a.round === 1 && a.actorName === 'イカロス');
        const actionAfterBoss = actions[bossActionIndex];
        const charState = actionAfterBoss.characterStates.find(c => c.name === 'SupBuff');
        const hasBuff = charState?.receivedSkills.some(s => s.name === 'TestSkill');

        expect(hasBuff).toBe(false);
    });

    test('Icarus should remove Supporter Debuffs (normal)', () => {
        // Supporter applies debuff to self (Target: Self) - rare but possible for testing logic
        const character = createTestCharacter('SupDebuff', 'Supporter', 'Debuff', false);
        const party = [character];
        const maxRounds = 2;

        const actions = simulateTurns(party, maxRounds, ICARUS);

        const bossActionIndex = actions.findIndex(a => a.round === 1 && a.actorName === 'イカロス');
        const actionAfterBoss = actions[bossActionIndex];
        const charState = actionAfterBoss.characterStates.find(c => c.name === 'SupDebuff');
        const hasDebuff = charState?.receivedSkills.some(s => s.name === 'TestSkill');

        expect(hasDebuff).toBe(false);
    });

    test('Icarus should NOT remove Attacker Buffs', () => {
        const character = createTestCharacter('AtkBuff', 'Attacker', 'Buff', false);
        const party = [character];
        const maxRounds = 2;

        const actions = simulateTurns(party, maxRounds, ICARUS);

        const bossActionIndex = actions.findIndex(a => a.round === 1 && a.actorName === 'イカロス');
        const actionAfterBoss = actions[bossActionIndex];
        const charState = actionAfterBoss.characterStates.find(c => c.name === 'AtkBuff');
        const hasBuff = charState?.receivedSkills.some(s => s.name === 'TestSkill');

        expect(hasBuff).toBe(true);
    });

    test('Icarus should NOT remove Undispellable Supporter Buffs', () => {
        const character = createTestCharacter('SupUndisp', 'Supporter', 'Buff', true);
        const party = [character];
        const maxRounds = 2;

        const actions = simulateTurns(party, maxRounds, ICARUS);

        const bossActionIndex = actions.findIndex(a => a.round === 1 && a.actorName === 'イカロス');
        const actionAfterBoss = actions[bossActionIndex];
        const charState = actionAfterBoss.characterStates.find(c => c.name === 'SupUndisp');
        const hasBuff = charState?.receivedSkills.some(s => s.name === 'TestSkill');

        expect(hasBuff).toBe(true);
    });
});
