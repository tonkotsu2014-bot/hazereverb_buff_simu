import { useState } from 'react';
import { simulateTurns, type Action } from '../logic/turnSimulator';
import type { PartyMember } from '../components/simulation/turn/PartyConfigurationPanel';
import { DEFAULT_BOSS, ICARUS } from '../logic/bossData';

interface UseTurnSimulatorReturn {
    results: Action[] | null;
    error: string | null;
    runSimulation: (party: PartyMember[], maxRounds: number, bossId?: string) => void;
    clearResults: () => void;
}

/**
 * UIのPartyMemberオブジェクトを、シミュレーションエンジンが理解できる形式に変換します。
 * 
 * 主な変換処理:
 * 1. IDベースのターゲット指定 (`supportTargets: string[]`) を、配列インデックス (`supportTargetIndices: number[]`) に変換
 * 2. 文字列区切りのラウンド指定 (`exSkillRounds: string`) を、数値配列 (`exSkillRounds: number[]`) にパース
 * 3. 文字列の `deathRound` を数値に変換
 * 4. `activeSkillLevel` が指定されている場合、全スキルのレベル情報を上書き
 * 
 * @param party UIコンポーネントで管理されているパーティーメンバー配列
 * @returns シミュレーション実行用のキャラクター配列 (`SimulationCharacter[]`相当)
 */
const adaptPartyToSimulation = (party: PartyMember[]) => {
    return party.map(p => {
        // Convert ID-based targets to Indices
        // シミュレーションエンジンは「自分から見て何番目のキャラを支援するか」という相対インデックスで処理するため変換が必要です。
        const supportTargetIndices = p.supportTargets
            ?.map(targetId => party.findIndex(member => member.id === targetId))
            .filter(idx => idx !== -1); // Filter out invalid indices

        // Parse comma/space separated rounds string to number array
        const exSkillRounds = p.exSkillRounds
            ? p.exSkillRounds.split(/[,\s]+/).map(r => parseInt(r)).filter(n => !isNaN(n))
            : [];

        const simChar = {
            ...p,
            deathRound: p.deathRound ? parseInt(p.deathRound) : undefined,
            supportTargetIndices,
            exSkillRounds
        };

        // Apply active levels to skills
        // UI上で一括レベル設定されている場合、個々のスキルのレベルを上書きします。
        if (p.activeSkillLevel) {
            simChar.skills = simChar.skills.map(skill => {
                return { ...skill, activeLevel: p.activeSkillLevel };
            });
        }

        return simChar;
    });
};

export const useTurnSimulator = (): UseTurnSimulatorReturn => {
    const [results, setResults] = useState<Action[] | null>(null);
    const [error, setError] = useState<string | null>(null);

    const runSimulation = (party: PartyMember[], maxRounds: number, bossId: string = 'default') => {
        try {
            setError(null);

            // 1. Adapter: Convert UI data to Simulation data
            // Logic extracted to pure function `adaptPartyToSimulation`
            const simulationParty = adaptPartyToSimulation(party);

            // 2. Select Boss Logic
            let boss = DEFAULT_BOSS;
            if (bossId === 'icarus') {
                boss = { ...ICARUS }; // Use spread to avoid mutation issues if any
            }
            // Add more bosses here as needed

            // 3. Execution: Run the physics engine
            const simResults = simulateTurns(simulationParty, maxRounds, boss);
            setResults(simResults);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error occurred');
            setResults(null);
        }
    };

    const clearResults = () => {
        setResults(null);
        setError(null);
    };

    return {
        results,
        error,
        runSimulation,
        clearResults
    };
};
