import { describe, it, expect } from 'vitest';
import { simulateTurns, type SimulationCharacter, type ReceivedSkill } from '../logic/turnSimulator';
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

    // Helper to check if a character has received a specific skill
    const hasReceivedSkill = (receivedSkills: ReceivedSkill[] | undefined, skillName: string): boolean => {
        return !!receivedSkills?.some(s => s.name === skillName);
    };

    // Helper to check skill count
    const getSkillCount = (receivedSkills: ReceivedSkill[] | undefined, skillName: string): number => {
        return receivedSkills?.filter(s => s.name === skillName).length || 0;
    };

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

        // Action 0: Bob
        expect(actions[0].actorName).toBe('Bob');
        const state0 = actions[0].characterStates;
        const alice0 = state0.find(c => c.name === 'Alice');
        const bob0 = state0.find(c => c.name === 'Bob');

        expect(hasReceivedSkill(alice0?.receivedSkills, 'BobBuff')).toBe(true);
        expect(alice0?.receivedSkills[0].effects[0].value).toBe(10); // Check effect value
        expect(hasReceivedSkill(bob0?.receivedSkills, 'BobBuff')).toBe(false);

        // Action 1: Alice
        expect(actions[1].actorName).toBe('Alice');
        const state1 = actions[1].characterStates;
        const alice1 = state1.find(c => c.name === 'Alice');
        expect(hasReceivedSkill(alice1?.receivedSkills, 'BobBuff')).toBe(true);
        expect(hasReceivedSkill(alice1?.receivedSkills, 'AliceSelf')).toBe(true);

        // Action 3: Charlie
        expect(actions[3].actorName).toBe('Charlie');
        const state3 = actions[3].characterStates;

        const alice3 = state3.find(c => c.name === 'Alice');
        const bob3 = state3.find(c => c.name === 'Bob');
        const charlie3 = state3.find(c => c.name === 'Charlie');

        expect(hasReceivedSkill(alice3?.receivedSkills, 'CharlieAll')).toBe(true);
        expect(hasReceivedSkill(bob3?.receivedSkills, 'CharlieAll')).toBe(true);
        expect(hasReceivedSkill(charlie3?.receivedSkills, 'CharlieAll')).toBe(true);
    });

    it('should exclude dead characters from receiving skills', () => {
        const party = [
            mockCharacter('Healer', 'Attacker', { skills: [createSkill('HealAll', 'AllAllies')] }),
            mockCharacter('DeadGuy', 'Attacker', { deathRound: 1 })
        ];

        const actions = simulateTurns(party, 1);

        expect(actions[0].actorName).toBe('Healer');
        const state = actions[0].characterStates;

        const healer = state.find(c => c.name === 'Healer');
        const deadGuy = state.find(c => c.name === 'DeadGuy');

        expect(hasReceivedSkill(healer?.receivedSkills, 'HealAll')).toBe(true);
        expect(hasReceivedSkill(deadGuy?.receivedSkills, 'HealAll')).toBe(false);
    });

    it('should handle stackable and non-stackable skills correctly', () => {
        const party = [
            mockCharacter('Alice', 'Attacker', {
                skills: [
                    createSkill('NonStack', 'Self', false),
                    createSkill('Stackable', 'Self', true)
                ]
            })
        ];

        const actions = simulateTurns(party, 2);
        const r2Action = actions.find(a => a.round === 2 && a.actorName === 'Alice');
        const r2State = r2Action?.characterStates.find(c => c.name === 'Alice');

        expect(getSkillCount(r2State?.receivedSkills, 'NonStack')).toBe(1);
        expect(getSkillCount(r2State?.receivedSkills, 'Stackable')).toBe(2);
    });

    it('should isolate stackable logic per skill (prevent bleeding)', () => {
        const party = [
            mockCharacter('MixedChar', 'Attacker', {
                skills: [
                    createSkill('StackBuff', 'Self', true),
                    createSkill('UniqueBuff1', 'Self', false),
                    createSkill('UniqueBuff2', 'Self', false)
                ]
            }),
            mockCharacter('PureChar', 'Attacker', {
                skills: [
                    createSkill('PureBuff1', 'Self', false),
                    createSkill('PureBuff2', 'Self', false),
                    createSkill('PureBuff3', 'Self', false)
                ]
            })
        ];

        const actions = simulateTurns(party, 3);
        const lastAction = actions.find(a => a.round === 3 && a.actorName === 'PureChar');
        const state = lastAction?.characterStates;

        const mixedState = state?.find(c => c.name === 'MixedChar');
        const pureState = state?.find(c => c.name === 'PureChar');

        expect(getSkillCount(mixedState?.receivedSkills, 'StackBuff')).toBe(3);
        expect(getSkillCount(mixedState?.receivedSkills, 'UniqueBuff1')).toBe(1);
        expect(getSkillCount(mixedState?.receivedSkills, 'UniqueBuff2')).toBe(1);

        expect(getSkillCount(pureState?.receivedSkills, 'PureBuff1')).toBe(1);
        expect(getSkillCount(pureState?.receivedSkills, 'PureBuff2')).toBe(1);
        expect(getSkillCount(pureState?.receivedSkills, 'PureBuff3')).toBe(1);
    });

    it('should isolate stackable logic per skill (prevent bleeding)', () => {
        const party = [
            mockCharacter('MixedChar', 'Attacker', {
                skills: [
                    createSkill('StackBuff', 'AllAllies', true),
                    createSkill('UniqueBuff1', 'Self', false),
                    createSkill('UniqueBuff2', 'Self', false)
                ]
            }),
            mockCharacter('PureChar', 'Attacker', {
                skills: [
                    createSkill('PureBuff1', 'Self', false),
                    createSkill('PureBuff2', 'Self', false),
                    createSkill('PureBuff3', 'Self', false)
                ]
            })
        ];

        const actions = simulateTurns(party, 3);
        const lastAction = actions.find(a => a.round === 3 && a.actorName === 'PureChar');
        const state = lastAction?.characterStates;

        const mixedState = state?.find(c => c.name === 'MixedChar');
        const pureState = state?.find(c => c.name === 'PureChar');

        expect(getSkillCount(mixedState?.receivedSkills, 'StackBuff')).toBe(3);
        expect(getSkillCount(mixedState?.receivedSkills, 'UniqueBuff1')).toBe(1);
        expect(getSkillCount(mixedState?.receivedSkills, 'UniqueBuff2')).toBe(1);

        expect(getSkillCount(pureState?.receivedSkills, 'PureBuff1')).toBe(1);
        expect(getSkillCount(pureState?.receivedSkills, 'PureBuff2')).toBe(1);
        expect(getSkillCount(pureState?.receivedSkills, 'PureBuff3')).toBe(1);
    });

    it('should correctly set the source of received skills', () => {
        const party = [
            mockCharacter('Buffer', 'Supporter', {
                skills: [createSkill('BuffSkill', 'AllAllies')]
            }),
            mockCharacter('Receiver', 'Attacker')
        ];

        const actions = simulateTurns(party, 1);
        const state = actions[0].characterStates; // Buffer acts first

        const buffer = state.find(c => c.name === 'Buffer');
        const receiver = state.find(c => c.name === 'Receiver');

        // Check Buffer (Self from AllAllies)
        const buffOnBuffer = buffer?.receivedSkills.find(s => s.name === 'BuffSkill');
        expect(buffOnBuffer).toBeDefined();
        expect(buffOnBuffer?.source).toBe('Buffer');

        // Check Receiver
        const buffOnReceiver = receiver?.receivedSkills.find(s => s.name === 'BuffSkill');
        expect(buffOnReceiver).toBeDefined();
        expect(buffOnReceiver?.source).toBe('Buffer');
    });
});
