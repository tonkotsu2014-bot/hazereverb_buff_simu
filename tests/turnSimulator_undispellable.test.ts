
import { describe, test, expect } from 'vitest';
import { simulateTurns, SimulationCharacter, Action } from '../src/logic/turnSimulator';
import { ICARUS } from '../src/logic/bossData';

describe('Turn Simulator - Undispellable Buffs', () => {
    // Helper to create a test character with a buff skill
    const createTestCharacter = (name: string, isUndispellable: boolean): SimulationCharacter => {
        return {
            name,
            role: 'Supporter',
            type: '支援型',
            skills: [
                {
                    name: 'BuffSkill',
                    levels: [
                        {
                            level: '1',
                            description: null,
                            effects: [
                                {
                                    attribute: 'Attack',
                                    value: 50,
                                    type: 'Buff',
                                    duration: 3,
                                    target: 'Self',
                                    isUndispellable: isUndispellable // Set directly on effect
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

    test('Icarus should remove normal buffs', () => {
        const character = createTestCharacter('NormalChar', false);
        const party = [character];
        const maxRounds = 2; // Enough for Icarus to act

        const actions = simulateTurns(party, maxRounds, ICARUS);

        // Find state after Round 1, when both have acted.
        // Or check Round 2 start state.

        // Let's inspect the snapshot after Icarus action in Round 1.
        // Actions are sequential.

        // Find Character's action in Round 1
        const charAction = actions.find(a => a.round === 1 && a.actorName === 'NormalChar');
        expect(charAction).toBeDefined();

        // At the moment of character action, he likely just applied the buff (or start of turn).
        // Let's check Icarus Action.
        const bossAction = actions.find(a => a.round === 1 && a.actorName === 'イカロス');
        expect(bossAction).toBeDefined();

        // Check the state of character AFTER Boss action.
        // The action object contains the state of party at that moment.
        // But simulateTurns returns a sequence of actions.
        // We need to check the state inside the Boss action or the NEXT action.

        const bossActionIndex = actions.findIndex(a => a.round === 1 && a.actorName === 'イカロス');
        const actionAfterBoss = actions[bossActionIndex];
        // Note: The action object captures the state *during* the action, 
        // but for Boss, the effect (clear buff) happens *onAction*.
        // The state inside `bossAction` might reflect properties *before* or *after* logic exe?
        // Usually `pushAction` is called after logic execution in `simulateTurns`.

        const charStateInBossAction = actionAfterBoss.characterStates.find(c => c.name === 'NormalChar');
        // Because normal buff, it should be cleared.
        const hasBuff = charStateInBossAction?.receivedSkills.some(s => s.name === 'BuffSkill' && s.effects.some(e => e.type === 'Buff'));

        expect(hasBuff).toBe(false);
    });

    test('Icarus should NOT remove undispellable buffs', () => {
        const character = createTestCharacter('UndispellableChar', true);
        const party = [character];
        const maxRounds = 2;

        const actions = simulateTurns(party, maxRounds, ICARUS);

        const bossActionIndex = actions.findIndex(a => a.round === 1 && a.actorName === 'イカロス');
        const actionAfterBoss = actions[bossActionIndex];

        const charStateInBossAction = actionAfterBoss.characterStates.find(c => c.name === 'UndispellableChar');

        // Should HAVE buff
        const hasBuff = charStateInBossAction?.receivedSkills.some(s => s.name === 'BuffSkill' && s.effects.some(e => e.type === 'Buff'));

        expect(hasBuff).toBe(true);
    });
});
