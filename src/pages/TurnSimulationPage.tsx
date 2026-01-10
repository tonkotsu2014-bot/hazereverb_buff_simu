import React, { useState, useEffect } from 'react';
import {
    Box,
    Typography,
    Grid
} from '@mui/material';
import { CharacterList } from '../components/CharacterList';
import type { ParsedCharacterData } from '../logic/wikiParser';
import { PartyConfigurationPanel } from '../components/simulation/turn/PartyConfigurationPanel';
import { TurnSimulationResults } from '../components/simulation/turn/TurnSimulationResults';
import { useTurnSimulationState } from '../hooks/useTurnSimulationState';
import { useTurnSimulator } from '../hooks/useTurnSimulator';

interface TurnSimulationPageProps {
    characters: ParsedCharacterData[];
}

export const TurnSimulationPage: React.FC<TurnSimulationPageProps> = ({ characters }) => {
    // State management and sync logic extracted to hook
    const {
        party,
        setParty,
        maxRounds,
        setMaxRounds,
        addMember,
        removeMember,
        clearParty
    } = useTurnSimulationState(characters);

    // Simulation logic extracted to hook
    const {
        results: simulationResults,
        error,
        runSimulation,
        clearResults
    } = useTurnSimulator();

    const handleClearParty = () => {
        clearParty();
        clearResults();
    };

    const handleStartSimulation = () => {
        runSimulation(party, maxRounds);
    };

    return (
        <Box sx={{ p: 2, height: 'auto', minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" gutterBottom fontWeight={700}>
                ターンシミュレーター
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2 }}>
                左側のリストから「＋」ボタンでキャラを追加できます。(最大9人)
            </Typography>

            <Grid container spacing={2} sx={{ flex: 1 }}>
                {/* Left Column: Character List */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <CharacterList
                        characters={characters}
                        onAdd={addMember}
                        onSelect={addMember}
                    />
                </Grid>

                {/* Right Column: Config & Results */}
                <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Party Config */}
                    <PartyConfigurationPanel
                        party={party}
                        onPartyChange={setParty}
                        maxRounds={maxRounds}
                        onMaxRoundsChange={setMaxRounds}
                        onStartSimulation={handleStartSimulation}
                        onClearParty={handleClearParty}
                        onRemoveMember={removeMember}
                    // onEditMember removed
                    />

                    {/* Results */}
                    <TurnSimulationResults
                        results={simulationResults}
                        error={error}
                        party={party}
                    />
                </Grid>
            </Grid>
        </Box>
    );
};
