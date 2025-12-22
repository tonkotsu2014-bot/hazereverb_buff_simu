
import { simulateTurns, type SimulationCharacter } from '../src/logic/turnSimulator';
import type { SkillData } from '../src/logic/wikiParser';
import { describe, test, expect } from 'vitest';

describe('Turn Simulator - Skill Duration & Remaining Turns', () => {
    // Helper to create character
    const createCharacter = (name: string, speed: number, exRounds: number[] = []): SimulationCharacter => ({
        name,
        role: 'Attacker',
        type: '攻撃型',
        attackRange: { row: 1, col: 1 },
        stats: { hp: 100, attack: 100, defense: 10, speed: speed } as any,
        skills: [],
        exSkillRounds: exRounds
    });

    const createNormalSkill = (name: string): SkillData => ({
        name,
        levels: [{
            level: '1',
            description: 'Normal Skill',
            effects: [{ attribute: 'Attack', value: 10, type: 'Buff', target: 'Self', duration: 3 }] // Duration 3
        }]
    });

    const createExSkill = (name: string): SkillData => ({
        name,
        levels: [{
            level: 'Ex',
            description: 'Ex Skill',
            effects: [{ attribute: 'Attack', value: 20, type: 'Buff', target: 'Self', duration: 2 }] // Duration 2
        }]
    });

    test('Skill duration should decrement each turn and reset when re-applied', () => {
        const charB = createCharacter('CharB', 100, [2]);
        charB.skills = [createNormalSkill('Normal B'), createExSkill('Ex B')];
        // Normal B Dur=3. Ex B Dur=2.

        // R1: Normal B cast.
        // R2: EX B cast + Normal B cast. (Normal B refreshed).
        // R3: Normal B cast.

        const result = simulateTurns([charB], 4);
        const charActions = result.filter(a => a.actorRole !== 'System');

        // R2 (Index 2. R1=0,1. R2=2,3) -> With filtering
        const r2Action = charActions[2]; // CharB action in R2
        expect(r2Action.round).toBe(2);
        const r2State = r2Action.characterStates.find(c => c.name === 'CharB');
        const exSkillR2 = r2State?.receivedSkills.find(s => s.name === 'Ex B');
        expect(exSkillR2).toBeDefined();
        // Check remaining term
        // Duration 2. Start R2. Current R2. Rem = 2 - (2-2) = 2.
        expect(exSkillR2?.effects[0].remainingTurn).toBe(2);

        // R3 (Index 4. R2=2,3. R3=4,5).
        // R3 (Index 4. R2=2,3. R3=4,5).
        const r3Action = charActions[4]; // CharB action in R3
        expect(r3Action.round).toBe(3);
        const r3State = r3Action.characterStates.find(c => c.name === 'CharB');
        const exSkillR3 = r3State?.receivedSkills.find(s => s.name === 'Ex B');
        // Start R2. Current R3. Rem = 2 - (3-2) = 1? No.
        // Start T3. Current T5 (R3 Start).
        // T3 acted (Start) -> T3 Rem 2.
        // T4 Boss acted -> T4 Rem 1.
        // T5 CharB acts -> T5 Rem 0.
        // Since it expires at the START of the turn (conceptually) or during action?
        // User rule: "Turn 2 Rem 8 -> Turn 3 Rem 7".
        // Here: T3 (Dur 2) -> T4 (Rem 1) -> T5 (Rem 0).
        expect(exSkillR3).toBeUndefined();

        // R4 (Index 6)
        // R4 (Index 6)
        const r4Action = charActions[6]; // CharB action in R4
        expect(r4Action.round).toBe(4);
        const r4State = r4Action.characterStates.find(c => c.name === 'CharB');
        // Start R2. Current R4. Rem = 2 - (4-2) = 0.
        const exSkillR4 = r4State?.receivedSkills.find(s => s.name === 'Ex B');
        expect(exSkillR4).toBeUndefined();

        // Check Normal Skill Reset
        // R1: Cast (Start 1). Rem 3.
        // R2: Cast (Start 2 - Overwritten). Rem 3.
        // Note: Indices 0 and 2 in charActions correspond to CharB's actions in R1 and R2
        const normalSkillR1 = charActions[0].characterStates[0].receivedSkills.find(s => s.name === 'Normal B');
        expect(normalSkillR1?.startRound).toBe(1);
        expect(normalSkillR1?.effects[0].remainingTurn).toBe(3);

        const normalSkillR2 = charActions[2].characterStates[0].receivedSkills.find(s => s.name === 'Normal B');
        expect(normalSkillR2?.startRound).toBe(2); // Should have updated
        expect(normalSkillR2?.effects[0].remainingTurn).toBe(3); // Should have reset
    });

    test('Different effects within the same skill should track durations independently', () => {
        const charC = createCharacter('CharC', 100, [1]); // EX Round 1 to apply skill

        const mixedSkill: SkillData = {
            name: 'Mixed Duration Buff',
            levels: [{
                level: 'Ex',
                description: 'Buffs with different durations',
                effects: [
                    { attribute: 'Attack', value: 10, type: 'Buff', target: 'Self', duration: 2 }, // Short: 2 Turns
                    { attribute: 'Defense', value: 10, type: 'Buff', target: 'Self', duration: 5 }  // Long: 5 Turns
                ]
            }]
        };

        charC.skills = [mixedSkill]; // Only this skill

        // R1: EX activates. Mixed Skill applied. StartRound = 1.
        // Effect 1 (Atk): Dur 2. Rem 2.
        // Effect 2 (Def): Dur 5. Rem 5.

        // R2: Elapsed 1.
        // Effect 1: Rem 1.
        // Effect 2: Rem 4.

        // R3: Elapsed 2.
        // Effect 1: Rem 0 (Expired).
        // Effect 2: Rem 3.

        const result = simulateTurns([charC], 3);
        const charActions = result.filter(a => a.actorRole !== 'System');

        // Round 1
        const r1Action = charActions[0];
        const r1State = r1Action.characterStates[0].receivedSkills.find(s => s.name === 'Mixed Duration Buff');
        expect(r1State).toBeDefined();
        // Index 0: Attack (Dur 2)
        expect(r1State?.effects[0].attribute).toBe('Attack');
        expect(r1State?.effects[0].remainingTurn).toBe(2);
        // Index 1: Defense (Dur 5)
        expect(r1State?.effects[1].attribute).toBe('Defense');
        expect(r1State?.effects[1].remainingTurn).toBe(5);

        // Round 2 (Index 2 -> R1(0,1), R2(2,3))
        const r2Action = charActions[2];
        const r2State = r2Action.characterStates[0].receivedSkills.find(s => s.name === 'Mixed Duration Buff');
        // Effect 0 (Attack) passed its duration (2 turns), so it should be removed.
        // Effect 1 (Defense) has duration 5, remaining 3.
        // Since one effect remains, the skill should still exist, but the expired effect should be gone.
        // Note: The array of effects is re-mapped. If we rely on index, we must be careful.
        // But normally `receivedSkills` effects order matches unless filtered.
        // If filtered, length changes.
        expect(r2State?.effects.length).toBe(1);
        expect(r2State?.effects[0].attribute).toBe('Defense'); // Only defense remains
        expect(r2State?.effects[0].remainingTurn).toBe(3);

        // Round 3 (Index 4)
        const r3Action = charActions[4];
        const r3State = r3Action.characterStates[0].receivedSkills.find(s => s.name === 'Mixed Duration Buff');
        // Effect 1 should be 0 (expired)
        // Effect 1 should be gone (expired previously)
        // Effect 2 should be 1
        expect(r3State?.effects.length).toBe(1);
        expect(r3State?.effects[0].attribute).toBe('Defense');
        expect(r3State?.effects[0].remainingTurn).toBe(1);
    });

    test('Supporter skills with different durations (18T and 3T) should be tracked correctly', () => {
        // Supporter acts in R1 then "dies" in R2 to stop re-casting, allowing us to allow duration decay
        const supporter = createCharacter('SupporterSpecific', 100);
        supporter.role = 'Supporter';
        supporter.type = '支援型';
        supporter.supportTargetIndices = [1]; // Target the attacker (index 1)
        supporter.deathRound = 2; // Dies in Round 2, so skills are only cast in Round 1

        const attacker = createCharacter('AttackerSpecific', 100);

        const skill1: SkillData = {
            name: 'Skill 1 (Long)',
            levels: [{
                level: '1',
                description: '18T Buff',
                effects: [{ attribute: 'Attack', value: 10, type: 'Buff', target: 'Support', duration: 18 }]
            }]
        };

        const skill2: SkillData = {
            name: 'Skill 2 (Short)',
            levels: [{
                level: '1',
                description: 'Two 3T Buffs',
                effects: [
                    { attribute: 'Defense', value: 20, type: 'Buff', target: 'Support', duration: 3 },
                    { attribute: 'CritRate', value: 30, type: 'Buff', target: 'Support', duration: 3 }
                ]
            }]
        };

        supporter.skills = [skill1, skill2];

        // R1: Supporter casts both skills on Attacker.
        const result = simulateTurns([supporter, attacker], 4);

        // R1 Action 0 (Supporter)
        // R1 Action 1 (Attacker) - Check Receiver
        const r1AttackerAction = result.find(a => a.round === 1 && a.actorName === 'AttackerSpecific');
        expect(r1AttackerAction).toBeDefined();
        const r1AttackerState = r1AttackerAction!.characterStates[1];

        // Verify Long Buff (18T)
        const longBuff = r1AttackerState.receivedSkills.find(s => s.name === 'Skill 1 (Long)');
        expect(longBuff).toBeDefined();
        expect(longBuff?.effects[0].remainingTurn).toBe(17); // 18 - 1 (Attacker acted)

        // Verify Short Buff (3T)
        const shortBuff = r1AttackerState.receivedSkills.find(s => s.name === 'Skill 2 (Short)');
        expect(shortBuff).toBeDefined();
        expect(shortBuff?.effects[0].remainingTurn).toBe(2); // 3 - 1 (Attacker acted)
        expect(shortBuff?.effects[1].remainingTurn).toBe(2); // CritRate

        // Check Round 4
        // Supporter is dead, so no re-cast.
        // Current Round: 4. Start Round: 1. Elapsed: 3.
        const r4AttackerAction = result.find(a => a.round === 4 && a.actorName === 'AttackerSpecific');
        expect(r4AttackerAction).toBeDefined();
        const r4State = r4AttackerAction!.characterStates[1];

        // Long Buff: 18 - 3 = 15.
        const longBuffR4 = r4State.receivedSkills.find(s => s.name === 'Skill 1 (Long)');
        expect(longBuffR4?.effects[0].remainingTurn).toBe(11); // 18 - 7 (7 Actions since T1)

        // Short Buff: 3 - 3 = 0.
        // Short Buff: 3 - 3 = 0. Should be removed.
        const shortBuffR4 = r4State.receivedSkills.find(s => s.name === 'Skill 2 (Short)');
        expect(shortBuffR4).toBeUndefined();
    });
});
