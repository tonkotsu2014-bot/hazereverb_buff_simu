import { simulateTurns, type SimulationCharacter } from '../src/logic/turnSimulator';
import type { SkillData } from '../src/logic/wikiParser';
import { describe, test, expect } from 'vitest';

describe('Turn Simulator - Reproduction of Duration Removal', () => {
    const createCharacter = (name: string, exRounds: number[]): SimulationCharacter => ({
        name,
        role: 'Attacker',
        type: '攻撃型',
        attackRange: { row: 1, col: 1 },
        stats: { hp: 100, attack: 100, defense: 10, speed: 100 } as any,
        skills: [],
        exSkillRounds: exRounds
    });

    test('Skill effect should be removed when duration reaches 0', () => {
        // Use EX skill on Round 1 only so it is not re-cast
        const char = createCharacter('CharA', [1]);

        const skill: SkillData = {
            name: 'Test Skill',
            levels: [{
                level: 'Ex',
                description: 'Duration 4',
                effects: [{ attribute: 'Attack', value: 10, type: 'Buff', target: 'Self', duration: 4 }]
            }]
        };
        char.skills = [skill];

        // R1 (T1, T2) -> Cast (T1). Rem = 4.
        // R2 (T3, T4) -> T3 (Elapsed 2: 3-1). Rem = 2.
        // R3 (T5, T6) -> T5 (Elapsed 4: 5-1). Rem = 0. -> Should be removed.
        const result = simulateTurns([char], 3);

        const r3Action = result.find(a => a.round === 3 && a.actorName === 'CharA');
        expect(r3Action).toBeDefined();
        if (!r3Action) return;

        const r3State = r3Action.characterStates[0];
        const skillR3 = r3State.receivedSkills.find(s => s.name === 'Test Skill');

        if (skillR3) {
            const effect = skillR3.effects[0];
            console.log('Remaining Turn in R3:', effect.remainingTurn);
        }

        expect(skillR3).toBeUndefined();
    });
});
