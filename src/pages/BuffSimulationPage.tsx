import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Grid } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { CharacterSelector } from '../components/Simulation/CharacterSelector';
import { CharacterList } from '../components/CharacterList';
import { BuffResult } from '../components/Simulation/BuffResult';
import { calculateMaxBuffs } from '../logic/buffCalculation';
import type { ParsedCharacterData } from '../logic/wikiParser';

interface BuffSimulationPageProps {
    characters: ParsedCharacterData[];
}

export const BuffSimulationPage: React.FC<BuffSimulationPageProps> = ({ characters }) => {
    const [attacker, setAttacker] = useState<ParsedCharacterData | null>(null);
    const [supporters, setSupporters] = useState<(ParsedCharacterData | null)[]>([]);

    // Sync state with characters prop to reflect edits
    useEffect(() => {
        if (attacker) {
            const updatedAttacker = characters.find(c => c.name === attacker.name);
            if (updatedAttacker && updatedAttacker !== attacker) {
                setAttacker(updatedAttacker);
            }
        }

        setSupporters(prevSupporters => {
            let hasChanges = false;
            const nextSupporters = prevSupporters.map(s => {
                if (!s) return null;
                const updated = characters.find(c => c.name === s.name);
                if (updated && updated !== s) {
                    hasChanges = true;
                    return updated;
                }
                return s;
            });
            return hasChanges ? nextSupporters : prevSupporters;
        });
    }, [characters, attacker]);

    const handleAddSupporter = (index: number) => {
        if (supporters.length < 8) {
            setSupporters([...supporters, characters[index]]);
        }
    };

    const handleUpdateSupporter = (index: number, char: ParsedCharacterData | null) => {
        const newSupporters = [...supporters];
        newSupporters[index] = char;
        setSupporters(newSupporters);
    };

    const handleRemoveSupporter = (index: number) => {
        setSupporters(supporters.filter((_, i) => i !== index));
    };

    const results = useMemo(() => {
        if (!attacker) return null;
        const activeSupporters = supporters.filter((s): s is ParsedCharacterData => s !== null);
        return calculateMaxBuffs(attacker, activeSupporters);
    }, [attacker, supporters]);

    return (
        <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" gutterBottom>
                バフシミュレーション
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                左側のリストから「＋」ボタンで支援役を追加できます。(最大8人)
            </Typography>

            <Grid container spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
                {/* Left Column: Character List */}
                <Grid size={{ xs: 12, md: 3 }} sx={{ height: '100%', overflow: 'hidden' }}>
                    <CharacterList
                        characters={characters}
                        onAdd={handleAddSupporter}
                    />
                </Grid>

                {/* Right Column: Config & Results */}
                <Grid size={{ xs: 12, md: 9 }} sx={{ height: '100%', overflow: 'auto' }}>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>

                        {/* Simulation Config */}
                        <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                <Paper sx={{ p: 3 }}>
                                    <Typography variant="h6" gutterBottom>
                                        1. 攻撃役 (Attacker)
                                    </Typography>
                                    <CharacterSelector
                                        label="攻撃役を選択"
                                        characters={characters}
                                        selectedCharacter={attacker}
                                        onSelect={setAttacker}
                                    />
                                    {attacker && (
                                        <Box sx={{ mt: 2, p: 2, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                                            <Typography variant="subtitle2">Base Stats:</Typography>
                                            <Typography variant="body2">Crit Rate: {attacker.stats?.critRate || 0}%</Typography>
                                            <Typography variant="body2">Crit Damage: {attacker.stats?.critDamage || 0}%</Typography>
                                        </Box>
                                    )}
                                </Paper>
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                <Paper sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h6">
                                            2. 支援役 (Supporters) {supporters.length}/8
                                        </Typography>
                                    </Box>

                                    {supporters.length === 0 ? (
                                        <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                            左のリストから追加してください
                                        </Typography>
                                    ) : (
                                        supporters.map((supporter, index) => (
                                            <Box key={index} sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                                                <CharacterSelector
                                                    label={`支援役 #${index + 1}`}
                                                    characters={characters}
                                                    selectedCharacter={supporter}
                                                    onSelect={(c) => handleUpdateSupporter(index, c)}
                                                />
                                                <IconButton onClick={() => handleRemoveSupporter(index)} color="error" size="small">
                                                    <DeleteIcon />
                                                </IconButton>
                                            </Box>
                                        ))
                                    )}
                                </Paper>
                            </Box>
                        </Box>

                        {/* Results */}
                        <Box>
                            {results ? (
                                <BuffResult results={results} />
                            ) : (
                                <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                                    <Typography color="text.secondary">
                                        攻撃役を選択すると結果が表示されます
                                    </Typography>
                                </Paper>
                            )}
                        </Box>
                    </Box>
                </Grid>
            </Grid>
        </Box>
    );
};
