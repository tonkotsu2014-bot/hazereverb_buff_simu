import { describe, test, expect } from 'vitest';
import { simulateTurns, SimulationCharacter } from '../src/logic/turnSimulator';
import { ReceivedSkill } from '../src/logic/turnSimulator';

describe('Turn Simulator Death Effect Bug', () => {
    test('should NOT apply RoundStart effects for dead characters', () => {
        const charName = 'DeadManWalking';
        const buffValue = 50;

        const character: SimulationCharacter = {
            name: charName,
            role: 'Attacker',

            deathRound: 2, // Dies at the START of Round 2 (meaning they are dead for Round 2's start phase? Or during Round 2?)
            // The turnSimulator checks deathRound: "isDead = deathRound !== undefined && deathRound > 0 && round >= deathRound;"
            // So if deathRound is 2, they are dead in Round 2.
            skills: [
                {
                    name: 'Ghost Skill',
                    activeLevel: '10',
                    levels: [
                        {
                            level: '10',
                            description: 'Test Skill Description',
                            effects: [
                                {
                                    timing: 'RoundStart',
                                    target: 'AllAllies',
                                    type: 'Buff',
                                    attribute: 'Attack',
                                    value: buffValue,
                                    duration: 1
                                }
                            ]
                        }
                    ]
                }
            ]
        };

        const allyName = 'LivingAlly';
        const ally: SimulationCharacter = {
            name: allyName,
            role: 'Supporter',

            skills: []
        };

        const party = [character, ally];
        // Simulate for 3 rounds.
        // Round 1: Alive. Skill triggers.
        // Round 2: Dead. Skill should NOT trigger.
        // Round 3: Dead. Skill should NOT trigger.
        const actions = simulateTurns(party, 3);

        // Filter for RoundStart actions
        const roundStartActions = actions.filter(a => a.actorName === 'ラウンド開始時');

        // Check Round 1
        const r1 = roundStartActions.find(a => a.round === 1);
        const charStateR1 = r1?.characterStates.find(c => c.name === charName);
        const hasBuffR1 = charStateR1?.receivedSkills.some(s => s.name === 'Ghost Skill');
        expect(hasBuffR1).toBe(true);

        // Check Round 2 - Ally should NOT have the buff from the dead character
        const r2 = roundStartActions.find(a => a.round === 2);
        const allyStateR2 = r2?.characterStates.find(c => c.name === allyName);
        const hasBuffR2 = allyStateR2?.receivedSkills.some(s => s.name === 'Ghost Skill');

        // This should be true if the bug exists (Dead character applying buff to ally)
        // We expect it to be FALSE when fixed.
        // To confirm reproduction, we assert TRUE here (expecting failure means bug exists? No, standard is to write test expecting Correct Behavior, so it fails now)
        expect(hasBuffR2).toBe(false);
    });
});
