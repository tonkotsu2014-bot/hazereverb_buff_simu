import { describe, it, expect } from 'vitest';
import { simulateTurns, type SimulationCharacter } from '../logic/turnSimulator';
import type { SkillData } from '../logic/wikiParser';

describe('Turn Simulator Logic', () => {
    const mockCharacter = (
        name: string,
        role: string = 'Attacker',
        options: { deathRound?: number; supportTargetIndices?: number[]; skills?: SkillData[] } = {}
    ): SimulationCharacter => ({
        name,
        skills: options.skills || [],
        type: role === 'Supporter' ? '支援型' : '攻撃型',
        role,
        ...options
    });

    const createSkill = (
        name: string,
        target: 'Self' | 'AllAllies' | 'Default' = 'Default',
        isStackable: boolean = false
    ): SkillData => ({
        name,
        levels: [{
            level: '1',
            description: null,
            effects: [{
                type: 'Buff',
                attribute: 'Attack',
                value: 10,
                target,
                isStackable
            }]
        }]
    });

    it('should generate correct actions for a 3-person party over 2 rounds', () => {
        const party = [
            mockCharacter('Alice', 'Attacker'),
            mockCharacter('Bob', 'Supporter'),
            mockCharacter('Charlie', 'Supporter')
        ];

        const actions = simulateTurns(party, 2);

        expect(actions).toHaveLength(8);
        expect(actions[0].characterStates).toBeDefined();
        // Basic order check
        expect(actions[0].actorName).toBe('Alice');
        expect(actions[1].actorName).toBe('Boss');
    });

    it('should track received skills correctly', () => {
        const party = [
            // Bob (Supporter) targets Alice
            mockCharacter('Bob', 'Supporter', {
                supportTargetIndices: [1],
                skills: [createSkill('BobBuff')]
            }),
            // Alice (Attacker) uses Self buff
            mockCharacter('Alice', 'Attacker', {
                skills: [createSkill('AliceSelf', 'Self')]
            }),
            // Charlie (Attacker) uses AllAllies buff
            mockCharacter('Charlie', 'Attacker', {
                skills: [createSkill('CharlieAll', 'AllAllies')]
            })
        ];

        const actions = simulateTurns(party, 1);

        // Expected Sequence:
        // 1. Bob acts. Targets Alice. Alice gets 'BobBuff'.
        // 2. Alice acts. Self buff. Alice gets 'AliceSelf'.
        //    (Total Alice: BobBuff, AliceSelf)
        // 3. Boss acts (after 1st non-supporter aka Alice).
        // 4. Charlie acts. All Allies buff. Everyone gets 'CharlieAll'.
        //    (Total Alice: BobBuff, AliceSelf, CharlieAll)
        //    (Total Bob: CharlieAll)
        //    (Total Charlie: CharlieAll)

        // Action 0: Bob
        expect(actions[0].actorName).toBe('Bob');
        // Snapshot AFTER Bob acts
        const state0 = actions[0].characterStates;
        expect(state0.find(c => c.name === 'Alice')?.receivedSkills).toContain('BobBuff');
        expect(state0.find(c => c.name === 'Bob')?.receivedSkills).toHaveLength(0);

        // Action 1: Alice
        expect(actions[1].actorName).toBe('Alice');
        const state1 = actions[1].characterStates;
        expect(state1.find(c => c.name === 'Alice')?.receivedSkills).toEqual(expect.arrayContaining(['BobBuff', 'AliceSelf']));

        // Action 2: Boss
        expect(actions[2].actorName).toBe('Boss');
        // Boss shouldn't change skills usually, but snapshot persists

        // Action 3: Charlie
        expect(actions[3].actorName).toBe('Charlie');
        const state3 = actions[3].characterStates;

        // Verify final states
        const aliceState = state3.find(c => c.name === 'Alice');
        const bobState = state3.find(c => c.name === 'Bob');
        const charlieState = state3.find(c => c.name === 'Charlie');

        expect(aliceState?.receivedSkills).toEqual(expect.arrayContaining(['BobBuff', 'AliceSelf', 'CharlieAll']));
        expect(bobState?.receivedSkills).toEqual(expect.arrayContaining(['CharlieAll']));
        expect(charlieState?.receivedSkills).toEqual(expect.arrayContaining(['CharlieAll']));
    });

    it('should exclude dead characters from receiving skills', () => {
        const party = [
            mockCharacter('Healer', 'Attacker', { skills: [createSkill('HealAll', 'AllAllies')] }),
            mockCharacter('DeadGuy', 'Attacker', { deathRound: 1 })
        ];

        // DeadGuy dies at Round 1 (before start of simulation logic usually checks? Or during?)
        // In simulateTurns, 'isDead' check happens at start of round iteration for acting.
        // For receiving skills, we added logic: "if (dRound === undefined || dRound <= 0 || round < dRound)"

        // Round 1: DeadGuy is effectively dead for acting? 
        // "deathRound: 1" means they die IN Round 1? Usually "Death Round" implies they are gone BY that round?
        // Logic: `const isDead = deathRound !== undefined && deathRound > 0 && round >= deathRound;`
        // So if deathRound is 1, they are dead in Round 1.

        const actions = simulateTurns(party, 1);

        // Only Healer acts (DeadGuy is dead) -> Boss
        expect(actions[0].actorName).toBe('Healer');
        const state = actions[0].characterStates;

        expect(state.find(c => c.name === 'Healer')?.receivedSkills).toContain('HealAll');
        expect(state.find(c => c.name === 'DeadGuy')?.receivedSkills).not.toContain('HealAll');
    });

    it('should handle stackable and non-stackable skills correctly', () => {
        const party = [
            // Alice has a non-stackable self buff and a stackable self buff
            mockCharacter('Alice', 'Attacker', {
                skills: [
                    createSkill('NonStack', 'Self', false),
                    createSkill('Stackable', 'Self', true)
                ]
            })
        ];

        // Run for 2 rounds. Alice acts in R1 and R2.
        // R1: Applies NonStack, Stackable
        // R2: Applies NonStack, Stackable again
        const actions = simulateTurns(party, 2);

        // Check Round 2 state
        // Action count:
        // R1: Alice (act 0) -> Boss (act 1)
        // R2: Alice (act 2) -> Boss (act 3)

        // Final action is index 3 (Boss R2) or index 2 (Alice R2).
        // Let's check Alice R2 action specifically.
        const r2Action = actions.find(a => a.round === 2 && a.actorName === 'Alice');
        const r2State = r2Action?.characterStates.find(c => c.name === 'Alice');

        // NonStack should appear ONLY ONCE
        // Stackable should appear TWICE (once from R1, once from R2)
        const nonStackCount = r2State?.receivedSkills.filter(s => s === 'NonStack').length;
        const stackableCount = r2State?.receivedSkills.filter(s => s === 'Stackable').length;

        expect(nonStackCount).toBe(1);
        expect(stackableCount).toBe(2);
    });

    it('should isolate stackable logic per skill (prevent bleeding)', () => {
        const party = [
            // MixedChar: 1 Stackable, 2 Non-Stackable
            mockCharacter('MixedChar', 'Attacker', {
                skills: [
                    createSkill('StackBuff', 'Self', true),
                    createSkill('UniqueBuff1', 'Self', false),
                    createSkill('UniqueBuff2', 'Self', false)
                ]
            }),
            // PureChar: 3 Non-Stackable
            mockCharacter('PureChar', 'Attacker', {
                skills: [
                    createSkill('PureBuff1', 'Self', false),
                    createSkill('PureBuff2', 'Self', false),
                    createSkill('PureBuff3', 'Self', false)
                ]
            })
        ];

        // Run for 3 rounds to ensure multiple applications
        const actions = simulateTurns(party, 3);

        // Find the final state (last action of Round 3)
        // Order: MixedChar -> PureChar -> Boss
        const lastAction = actions.find(a => a.round === 3 && a.actorName === 'PureChar');
        const state = lastAction?.characterStates;

        const mixedState = state?.find(c => c.name === 'MixedChar');
        const pureState = state?.find(c => c.name === 'PureChar');

        // Verify MixedChar
        const stackBuffCount = mixedState?.receivedSkills.filter(s => s === 'StackBuff').length;
        const unique1Count = mixedState?.receivedSkills.filter(s => s === 'UniqueBuff1').length;
        const unique2Count = mixedState?.receivedSkills.filter(s => s === 'UniqueBuff2').length;

        expect(stackBuffCount).toBe(3); // 1 per round * 3 rounds
        expect(unique1Count).toBe(1); // Should not stack
        expect(unique2Count).toBe(1); // Should not stack

        // Verify PureChar
        const pure1Count = pureState?.receivedSkills.filter(s => s === 'PureBuff1').length;
        const pure2Count = pureState?.receivedSkills.filter(s => s === 'PureBuff2').length;
        const pure3Count = pureState?.receivedSkills.filter(s => s === 'PureBuff3').length;

        expect(pure1Count).toBe(1);
        expect(pure2Count).toBe(1);
        expect(pure3Count).toBe(1);
    });

    it('should isolate stackable logic per skill (prevent bleeding)', () => {
        const party = [
            // MixedChar: 1 Stackable, 2 Non-Stackable
            mockCharacter('MixedChar', 'Attacker', {
                skills: [
                    createSkill('StackBuff', 'AllAllies', true),
                    createSkill('UniqueBuff1', 'Self', false),
                    createSkill('UniqueBuff2', 'Self', false)
                ]
            }),
            // PureChar: 3 Non-Stackable
            mockCharacter('PureChar', 'Attacker', {
                skills: [
                    createSkill('PureBuff1', 'Self', false),
                    createSkill('PureBuff2', 'Self', false),
                    createSkill('PureBuff3', 'Self', false)
                ]
            })
        ];

        // Run for 3 rounds to ensure multiple applications
        const actions = simulateTurns(party, 3);

        // Find the final state (last action of Round 3)
        // Order: MixedChar -> PureChar -> Boss
        const lastAction = actions.find(a => a.round === 3 && a.actorName === 'PureChar');
        const state = lastAction?.characterStates;

        const mixedState = state?.find(c => c.name === 'MixedChar');
        const pureState = state?.find(c => c.name === 'PureChar');

        // Verify MixedChar
        const stackBuffCount = mixedState?.receivedSkills.filter(s => s === 'StackBuff').length;
        const unique1Count = mixedState?.receivedSkills.filter(s => s === 'UniqueBuff1').length;
        const unique2Count = mixedState?.receivedSkills.filter(s => s === 'UniqueBuff2').length;

        expect(stackBuffCount).toBe(3); // 1 per round * 3 rounds
        expect(unique1Count).toBe(1); // Should not stack
        expect(unique2Count).toBe(1); // Should not stack

        // Verify PureChar
        const pure1Count = pureState?.receivedSkills.filter(s => s === 'PureBuff1').length;
        const pure2Count = pureState?.receivedSkills.filter(s => s === 'PureBuff2').length;
        const pure3Count = pureState?.receivedSkills.filter(s => s === 'PureBuff3').length;

        expect(pure1Count).toBe(1);
        expect(pure2Count).toBe(1);
        expect(pure3Count).toBe(1);
    });
});
