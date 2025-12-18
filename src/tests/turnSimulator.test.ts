import { describe, it, expect } from 'vitest';
import { simulateTurns } from '../logic/turnSimulator';
import type { ParsedCharacterData } from '../logic/wikiParser';

describe('Turn Simulator Logic', () => {
    const mockCharacter = (name: string, role: string = 'Attacker'): ParsedCharacterData => ({
        name,
        skills: [],
        type: role === 'Supporter' ? '支援型' : '攻撃型',
        role
    });

    it('should generate correct actions for a 3-person party over 2 rounds', () => {
        const party = [
            mockCharacter('Alice', 'Attacker'),
            mockCharacter('Bob', 'Supporter'),
            mockCharacter('Charlie', 'Supporter')
        ];

        const actions = simulateTurns(party, 2);

        // 3 characters + 1 Boss per round = 4 actions/round * 2 = 8 actions
        expect(actions).toHaveLength(8);

        // Round 1
        expect(actions[0]).toEqual({
            round: 1, globalTurn: 1, actorIndex: 0, actorName: 'Alice',
            actorRole: 'Attacker', actorType: '攻撃型'
        });
        // Alice is Attacker (non-supporter), so Boss acts immediately after
        expect(actions[1]).toEqual({
            round: 1, globalTurn: 2, actorIndex: -1, actorName: 'Boss',
            actorRole: 'Boss', actorType: 'Boss'
        });
        expect(actions[2]).toEqual({
            round: 1, globalTurn: 3, actorIndex: 1, actorName: 'Bob',
            actorRole: 'Supporter', actorType: '支援型'
        });
        expect(actions[3]).toEqual({
            round: 1, globalTurn: 4, actorIndex: 2, actorName: 'Charlie',
            actorRole: 'Supporter', actorType: '支援型'
        });

        // Round 2
        expect(actions[4]).toEqual({
            round: 2, globalTurn: 5, actorIndex: 0, actorName: 'Alice',
            actorRole: 'Attacker', actorType: '攻撃型'
        });
        expect(actions[5]).toEqual({
            round: 2, globalTurn: 6, actorIndex: -1, actorName: 'Boss',
            actorRole: 'Boss', actorType: 'Boss'
        });
        expect(actions[6]).toEqual({
            round: 2, globalTurn: 7, actorIndex: 1, actorName: 'Bob',
            actorRole: 'Supporter', actorType: '支援型'
        });
        expect(actions[7]).toEqual({
            round: 2, globalTurn: 8, actorIndex: 2, actorName: 'Charlie',
            actorRole: 'Supporter', actorType: '支援型'
        });
    });

    it('should throw error for null characters', () => {
        const party = [
            mockCharacter('Alice', 'Attacker'),
            null,
            mockCharacter('Charlie', 'Supporter')
        ];

        // Should throw error because of null character
        expect(() => simulateTurns(party, 1)).toThrow('Invalid character in party at index 1');
    });

    it('should handle a full party of 9', () => {
        // Create party with one Attacker at index 4, others Supporters
        const party = Array.from({ length: 9 }, (_, i) => {
            // Index 4 is Attacker, rest Supporters
            return mockCharacter(`Char${i + 1}`, i === 4 ? 'Attacker' : 'Supporter');
        });

        const actions = simulateTurns(party, 1);

        // 9 characters + 1 boss = 10 actions
        expect(actions).toHaveLength(10);

        // Check Attacker at index 4 (5th character)
        // Order: S, S, S, S, A, Boss, S, S, S, S
        expect(actions[4]).toEqual({
            round: 1, globalTurn: 5, actorIndex: 4, actorName: 'Char5',
            actorRole: 'Attacker', actorType: '攻撃型'
        }); // Attacker
        expect(actions[5]).toEqual({
            round: 1, globalTurn: 6, actorIndex: -1, actorName: 'Boss',
            actorRole: 'Boss', actorType: 'Boss'
        }); // Boss acts after Char5
        expect(actions[9]).toEqual({
            round: 1, globalTurn: 10, actorIndex: 8, actorName: 'Char9',
            actorRole: 'Supporter', actorType: '支援型'
        }); // Last Supporter
    });

    it('should verify Boss acts after the FIRST non-supporter', () => {
        const party = [
            mockCharacter('Supporter1', 'Supporter'),
            mockCharacter('Attacker1', 'Attacker'),
            mockCharacter('Attacker2', 'Attacker'),
            mockCharacter('Supporter2', 'Supporter')
        ];

        const actions = simulateTurns(party, 1);

        // S1 -> A1 -> Boss -> A2 -> S2
        expect(actions).toHaveLength(5);
        expect(actions[0].actorName).toBe('Supporter1');
        expect(actions[1].actorName).toBe('Attacker1');
        expect(actions[2].actorName).toBe('Boss');
        expect(actions[3].actorName).toBe('Attacker2');
        expect(actions[4].actorName).toBe('Supporter2');
    });

    it('should exclude dead characters from specified round', () => {
        const party = [
            mockCharacter('Alice', 'Attacker'),
            mockCharacter('Bob', 'Supporter'),
            mockCharacter('Charlie', 'Supporter')
        ];

        // Alice dies at Round 2
        const deaths = [{ characterIndex: 0, deathRound: 2 }];
        const actions = simulateTurns(party, 2, deaths);

        // Round 1: Alice acts
        const r1 = actions.filter(a => a.round === 1);
        expect(r1.find(a => a.actorName === 'Alice')).toBeDefined();

        // Round 2: Alice skipped
        const r2 = actions.filter(a => a.round === 2);
        expect(r2.find(a => a.actorName === 'Alice')).toBeUndefined();

        // Check Round 2 order: Boss acts after 1st non-supporter.
        // If Alice (Attacker) is gone, only Supporters remain.
        // Boss should act at the END of the round.
        // We already filtered r2 above, so we can reuse or just re-verify
        const bossAction = r2.find(a => a.actorName === 'Boss');
        expect(bossAction).toBeDefined();

        // Ensure Boss is last
        expect(r2[r2.length - 1].actorName).toBe('Boss');
    });

    it('should adjust Boss turn when Attacker dies', () => {
        const party = [
            mockCharacter('Supporter1', 'Supporter'),
            mockCharacter('Attacker1', 'Attacker'),
            mockCharacter('Attacker2', 'Attacker')
        ];

        // Attacker1 dies at Round 1
        const deaths = [{ characterIndex: 1, deathRound: 1 }];
        const actions = simulateTurns(party, 1, deaths);

        // Order should be: S1 -> A2 (First acting Attacker) -> Boss
        expect(actions).toHaveLength(3);
        expect(actions[0].actorName).toBe('Supporter1');
        expect(actions[1].actorName).toBe('Attacker2');
        expect(actions[2].actorName).toBe('Boss');
    });

    it('should have Boss act at end if party is all Supporters', () => {
        const party = [
            mockCharacter('Supporter1', 'Supporter'),
            mockCharacter('Supporter2', 'Supporter'),
            mockCharacter('Supporter3', 'Supporter')
        ];

        const actions = simulateTurns(party, 1);

        // S1 -> S2 -> S3 -> Boss
        expect(actions).toHaveLength(4);
        expect(actions[3].actorName).toBe('Boss');
    });
});
