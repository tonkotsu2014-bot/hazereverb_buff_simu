import { useState, useEffect } from 'react';
import type { ParsedCharacterData } from '../logic/wikiParser';
import type { PartyMember } from '../components/simulation/turn/PartyConfigurationPanel';

interface UseTurnSimulationStateReturn {
    party: PartyMember[];
    setParty: (party: PartyMember[]) => void;
    maxRounds: number;
    setMaxRounds: (rounds: number) => void;
    selectedBossId: string;
    setSelectedBossId: (id: string) => void;
    addMember: (index: number) => void;
    removeMember: (id: string) => void;
    clearParty: () => void;
}

/**
 * キャラクターのマスターデータ（WikiParserの結果）と、現在保存されているパーティーメンバーの状態を同期させます。
 * 
 * ゲームのアップデート等でキャラクターの基本ステータスやスキル詳細が変更された場合、
 * 保存されているパーティーデータの該当部分を最新のマスターデータで上書きします。
 * ユーザーが個別に設定した情報（deathRound, supportTargets 等）は維持されます。
 * 
 * @param party 現在のパーティーメンバーの配列
 * @param characters 最新のキャラクターデータの配列
 * @returns 同期済みのパーティーメンバー配列。変更がない場合は新しい配列を生成せず、元の参照を返すべき箇所で最適化を行います。
 */
const syncPartyWithMasterData = (party: PartyMember[], characters: ParsedCharacterData[]): PartyMember[] => {
    return party.map(member => {
        const freshChar = characters.find(c => c.name === member.name);
        if (freshChar) {
            // Check if stats/skills changed
            // JSON.stringify is used for deep comparison of stats and skills objects.
            // This is acceptable because these objects are relatively small plain objects.
            if (JSON.stringify(member.stats) !== JSON.stringify(freshChar.stats) ||
                JSON.stringify(member.skills) !== JSON.stringify(freshChar.skills)) {

                // Merge fresh data with user's custom settings
                return {
                    ...freshChar,
                    id: member.id,
                    deathRound: member.deathRound,
                    supportTargets: member.supportTargets,
                    exSkillRounds: member.exSkillRounds,
                    activeSkillLevel: member.activeSkillLevel
                };
            }
        }
        return member;
    });
};

/**
 * 新しいパーティーメンバーを作成します。
 * 
 * 選択されたキャラクターデータを基に、一意なID（Drag & Drop用）や
 * シミュレーション用の初期設定値を持ったオブジェクトを生成します。
 * 
 * @param character 追加するキャラクターの元データ
 * @returns 初期化されたPartyMemberオブジェクト
 */
const createPartyMember = (character: ParsedCharacterData): PartyMember => {
    return {
        ...character,
        // ID generation: name + timestamp + random string to ensure uniqueness
        id: `${character.name}-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
        deathRound: '',
        supportTargets: [],
        exSkillRounds: '',
        activeSkillLevel: '10' // Default to Max Level (10) as per request
    };
};

export const useTurnSimulationState = (
    characters: ParsedCharacterData[]
): UseTurnSimulationStateReturn => {
    // 1. Initialize State (with Persistence)
    const [party, setParty] = useState<PartyMember[]>(() => {
        try {
            const saved = localStorage.getItem('hazreverb_turn_sim_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.party && Array.isArray(parsed.party)) {
                    return parsed.party;
                }
            }
        } catch (e) {
            console.error('Failed to load turn sim state', e);
        }
        return [];
    });

    const [maxRounds, setMaxRounds] = useState(() => {
        try {
            const saved = localStorage.getItem('hazreverb_turn_sim_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.maxRounds) {
                    return parsed.maxRounds;
                }
            }
        } catch (e) {
            console.error('Failed to load turn sim state', e);
        }
        return 5;
    });

    const [selectedBossId, setSelectedBossId] = useState<string>(() => {
        try {
            const saved = localStorage.getItem('hazreverb_turn_sim_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.selectedBossId) {
                    return parsed.selectedBossId;
                }
            }
        } catch (e) {
            console.error('Failed to load turn sim state', e);
        }
        return 'default';
    });

    // 2. Persistence Effect
    useEffect(() => {
        const state = { party, maxRounds, selectedBossId };
        localStorage.setItem('hazreverb_turn_sim_state', JSON.stringify(state));
    }, [party, maxRounds, selectedBossId]);

    // 3. Data Synchronization (Sync with Wiki Data)
    // We check this on every render and update if necessary.
    // Logic extracted to pure function `syncPartyWithMasterData`
    const syncedParty = syncPartyWithMasterData(party, characters);

    // Check if any member changed (reference equality check)
    // syncPartyWithMasterData returns a new array if mapping happened, but we need to check element-wise
    // or rely on the function implementation. 
    // The current implementation of map always returns a new array.
    // However, the elements inside might be the same references.
    // We need to check if ANY element reference has changed.
    const hasSyncChanges = syncedParty.some((member, index) => member !== party[index]);

    if (hasSyncChanges) {
        setParty(syncedParty);
    }

    // 4. Helper Methods
    const addMember = (index: number) => {
        if (party.length < 9) {
            const newMember = createPartyMember(characters[index]);
            setParty([...party, newMember]);
        }
    };

    const removeMember = (id: string) => {
        setParty(party.filter((p) => p.id !== id));
    };

    const clearParty = () => {
        setParty([]);
    };

    return {
        party,
        setParty,
        maxRounds,
        setMaxRounds,
        selectedBossId,
        setSelectedBossId,
        addMember,
        removeMember,
        clearParty
    };
};
