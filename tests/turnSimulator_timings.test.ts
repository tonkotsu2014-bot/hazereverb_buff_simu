import { describe, test, expect } from 'vitest';
import { simulateTurns, SimulationCharacter, Action } from '../src/logic/turnSimulator';
import { SkillData } from '../src/logic/wikiParser';

const createMockCharacter = (name: string, role: string, skills: SkillData[]): SimulationCharacter => {
    return {
        name,
        type: role === 'Supporter' ? '支援型' : '攻撃型', // Simplification
        role,
        skills,
        hp: '1000',
        attack: '100',
        defense: '50',
        critRate: '0',
        critDamage: '0',
        speed: '100',
        levels: [], // Mock if needed
        stats: {
            Hp: 1000,
            Attack: 100,
            Support: 100, // Important for supporter
            Armor: 50,
            CritRate: 0,
            CritDamage: 0,
            Mobility: 100
        }
    };
};

describe('Turn Simulator - Skill Timings', () => {
    test('BattleStart, RoundStart, and BeforeAction timings apply correctly', () => {
        // Character A: Battle Start Skill
        const charA = createMockCharacter('CharA', 'Attacker', [{
            name: 'SkillA',
            levels: [{
                level: '1',
                description: 'Battle Start Buff',
                effects: [{
                    type: 'Buff',
                    attribute: 'Attack',
                    value: 10,
                    timing: 'BattleStart',
                    target: 'Self',
                    isStackable: true,
                    duration: -1
                }]
            }],
            activeLevel: '1'
        }]);

        // Character B: Round Start Skill
        const charB = createMockCharacter('CharB', 'Supporter', [{
            name: 'SkillB',
            levels: [{
                level: '10',
                description: 'Round Start Buff',
                effects: [{
                    type: 'Buff',
                    attribute: 'Defense',
                    value: 20,
                    timing: 'RoundStart',
                    target: 'AllAllies',
                    isStackable: true,
                    duration: 1
                }]
            }],
            activeLevel: '10'
        }]);

        // Character C: Before Action and Normal Action
        const charC = createMockCharacter('CharC', 'Attacker', [{
            name: 'SkillC',
            levels: [{
                level: '5',
                description: 'Mixed Timing',
                effects: [
                    {
                        type: 'Buff',
                        attribute: 'CritRate',
                        value: 15,
                        timing: 'BeforeAction',
                        target: 'Self',
                        isStackable: true,
                        duration: 1
                    },
                    {
                        type: 'Buff',
                        attribute: 'Attack',
                        value: 50,
                        timing: 'Action', // Default
                        target: 'Self',
                        isStackable: true,
                        duration: 1
                    }
                ]
            }],
            activeLevel: '5'
        }]);

        const party = [charA, charB, charC];
        const actions = simulateTurns(party, 2);

        // Expected Sequence:
        // 1. Battle Start Phase (Action 0)
        // 2. Round 1 Start Phase (Action 1)
        // 3. Char A Turn (Action 2)
        // 4. Char B Turn (Action 3)
        // 5. Char C Turn (Action 4)
        // ... Round 2 Start Phase ...

        // Check Action 0: Battle Start
        expect(actions[0].actorName).toBe('戦闘開始時');
        expect(actions[0].round).toBe(0);
        // Check Char A has Attack Buff from Battle Start
        const charAState0 = actions[0].characterStates.find(c => c.name === 'CharA');
        const charABuffs0 = charAState0?.receivedSkills.flatMap(s => s.effects);
        expect(charABuffs0).toContainEqual(expect.objectContaining({ attribute: 'Attack', value: 10 }));

        // Check Action 1: Round 1 Start
        expect(actions[1].actorName).toBe('ラウンド開始時');
        expect(actions[1].round).toBe(1);
        // Check Char B applied Defense Buff to everyone
        const charAState1 = actions[1].characterStates.find(c => c.name === 'CharA');
        const activeBuffs1 = charAState1?.receivedSkills.flatMap(s => s.effects);
        expect(activeBuffs1).toContainEqual(expect.objectContaining({ attribute: 'Defense', value: 20 }));

        // Check Action 4: Char C Turn. Should have BeforeAction applied BEFORE snapshot?
        // Detailed check for Char C
        // When Action 4 is created, executeTurn has run.
        // BeforeAction effects should be in `accumulatedSkills` before the snapshot is taken?
        // Yes, processEffects adds to accumulatedSkills.
        // So in the snapshot of Action 4, Char C should have both CritRate (BeforeAction) and Attack (Action).
        // Wait, `processEffects` for 'Action' also runs before snapshot.
        // To verify strict ordering, we'd need to mock `accumulatedSkills.push` or rely on the final state being present.
        // But we can check they are present.
        const actionC = actions.find(a => a.actorName === 'CharC' && a.round === 1);
        expect(actionC).toBeDefined();
        if (actionC) {
            const charCState = actionC.characterStates.find(c => c.name === 'CharC');
            const buffs = charCState?.receivedSkills.flatMap(s => s.effects);
            expect(buffs).toContainEqual(expect.objectContaining({ attribute: 'CritRate', value: 15 })); // BeforeAction
            expect(buffs).toContainEqual(expect.objectContaining({ attribute: 'Attack', value: 50 })); // Action
        }

        // Verify Turn Counts (Round Start should not consume a turn)
        // Action 1: Round 1 Start -> Turn 1
        expect(actions[1].globalTurn).toBe(1);
        // Action 2: Char A Turn -> Turn 1 (First character of round)
        expect(actions[2].actorName).toBe('CharA');
        expect(actions[2].globalTurn).toBe(1);

        // Action 3: Boss (Turn 2)
        expect(actions[3].actorName).toBe('Boss');
        expect(actions[3].globalTurn).toBe(2);

        // Action 4: Char B Turn -> Turn 3
        expect(actions[4].actorName).toBe('CharB');
        expect(actions[4].globalTurn).toBe(3);

    });

    test('Round Start applies every round', () => {
        const charB = createMockCharacter('CharB', 'Supporter', [{
            name: 'SkillB',
            levels: [{
                level: '10',
                description: 'Round Start Buff',
                effects: [{
                    type: 'Buff',
                    attribute: 'Defense',
                    value: 20,
                    timing: 'RoundStart',
                    target: 'Self',
                    isStackable: true, // Stackable so we can see count increase? Or just refresh.
                    duration: 1
                }]
            }],
            activeLevel: '10'
        }]);

        const actions = simulateTurns([charB], 2);

        // Find Round 2 Start
        const r2Start = actions.find(a => a.actorName === 'ラウンド開始時' && a.round === 2);
        expect(r2Start).toBeDefined();
    });
});
