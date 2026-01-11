import { describe, it, expect } from 'vitest';
import { simulateTurns, SimulationCharacter, ReceivedSkill } from '../src/logic/turnSimulator';
import { SkillLevel, SkillEffect, SkillData } from '../src/logic/wikiParser';
import { ICARUS } from '../src/logic/bossData';

// Helper to create mock character
const mockCharacter = (name: string, role: string, overrides: Partial<SimulationCharacter> = {}): SimulationCharacter => ({
    name,
    role,
    type: 'Attack',
    stats: {
        HP: 1000,
        Attack: 100,
        Defense: 50,
        Speed: 100,
        Crit: 0,
        CritDmg: 0,
        Accuracy: 0,
        Evasion: 0,
        DebuffAccuracy: 0,
        DebuffResist: 0,
        Support: 0
    },
    skills: [],
    ...overrides
});

// Helper to create mock skill
const createSkill = (name: string, effects: SkillEffect[]): SkillData => ({
    name,
    levels: [{
        level: '1',
        description: 'Test Skill',
        effects
    }]
});

describe('Turn Simulator - Boss Logic', () => {
    it('should use default boss (do nothing) when no boss is provided', () => {
        const party = [
            mockCharacter('Alice', 'Attacker')
        ];

        // Run with undefined boss
        const actions = simulateTurns(party, 2);

        // Should have boss actions in the log
        const bossActions = actions.filter(a => a.actorType === 'Boss');
        expect(bossActions.length).toBeGreaterThan(0);
        expect(bossActions[0].actorName).toBe('Boss');
    });

    it('should use provided boss character', () => {
        const party = [
            mockCharacter('Alice', 'Attacker')
        ];

        const boss = mockCharacter('Icarus', 'Boss', {
            stats: { Speed: 200 }
        });

        const actions = simulateTurns(party, 2, boss);

        const bossActions = actions.filter(a => a.actorType === 'Boss');
        expect(bossActions.length).toBeGreaterThan(0);
        expect(bossActions[0].actorName).toBe('Icarus');
    });

    it('should execute boss function-based logic (ClearBuffs)', () => {
        // Setup: Alice has a buff
        const buffSkill = createSkill('AttackUp', [{ type: 'Buff', attribute: 'Attack', value: 50, target: 'Self' }]);
        const party = [
            mockCharacter('Alice', 'Attacker', { skills: [buffSkill] })
        ];

        // Use imported Icarus implementation
        const boss = ICARUS;

        // Run simulation
        const actions = simulateTurns(party, 2, boss);

        // Check Round 1 Action (Alice acts, gets buff)
        const aliceActIndex = actions.findIndex(a => a.actorName === 'Alice');
        expect(aliceActIndex).toBeGreaterThan(-1);

        // In the snapshot of Alice's action, she should have the buff because she just cast it on herself (Start Round logic or Action logic)
        // Alice acts -> resolves skills -> applies effects -> Snapshot.
        const stateAfterAlice = actions[aliceActIndex].characterStates[0];
        const hasBuffBefore = stateAfterAlice.receivedSkills.some(s => s.name === 'AttackUp');
        expect(hasBuffBefore).toBe(true);

        // Find Boss Action (should happen after Alice due to speed or default end-of-turn behavior if boss speed is low/default)
        // Note: In our mock, Alice Speed 100, Boss Speed 100.
        // turnSimulator logic:
        // party.forEach(...) -> executeTurn
        // if !bossActed -> pushBossAction
        // Since boss is not in 'party', boss acts after party if they have same speed? 
        // Actually, logic is: boss attempts to act interleaved if role != Supporter logic ... 
        // Wait, the new logic: 
        // party.forEach -> if acted, if role != Supporter && !bossActed -> pushBossAction.
        // So Boss acts after the first non-supporter acts? 
        // Alice is Attacker. Alice acts. bossActed becomes true. Boss acts IMMEDIATELY after Alice.

        const bossActIndex = actions.findIndex(a => a.actorType === 'Boss');
        expect(bossActIndex).toBeGreaterThan(aliceActIndex);

        // Inspect state of Alice immediately after Boss acts
        const stateAfterBoss = actions[bossActIndex].characterStates[0];
        const hasBuffAfter = stateAfterBoss.receivedSkills.some(s => s.name === 'AttackUp');
        expect(hasBuffAfter).toBe(false);
    });
});
