import React, { useState, useMemo } from 'react';
import { Box, Typography, Paper, Button, IconButton } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import { CharacterSelector } from '../components/Simulation/CharacterSelector';
import { BuffResult } from '../components/Simulation/BuffResult';
import { calculateMaxBuffs } from '../logic/buffCalculation';
import type { ParsedCharacterData } from '../logic/wikiParser';

interface BuffSimulationPageProps {
    characters: ParsedCharacterData[];
}

export const BuffSimulationPage: React.FC<BuffSimulationPageProps> = ({ characters }) => {
    const [attacker, setAttacker] = useState<ParsedCharacterData | null>(null);
    const [supporters, setSupporters] = useState<(ParsedCharacterData | null)[]>([]);

    const handleAddSupporter = () => {
        if (supporters.length < 8) {
            setSupporters([...supporters, null]);
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
        <Box sx={{ p: 4, maxWidth: 1200, mx: 'auto' }}>
            <Typography variant="h4" gutterBottom>
                バフシミュレーション
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                攻撃役を選択し、支援役を追加して最大バフ値を確認できます。(最大9人まで配置可能)
            </Typography>

            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 3 }}>
                <Box sx={{ flex: { xs: '1 1 100%', md: '0 0 40%' } }}>
                    <Paper sx={{ p: 3, mb: 3 }}>
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

                    <Paper sx={{ p: 3 }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Typography variant="h6">
                                2. 支援役 (Supporters)
                            </Typography>
                            <Button
                                startIcon={<AddIcon />}
                                variant="outlined"
                                onClick={handleAddSupporter}
                                disabled={supporters.length >= 8}
                            >
                                追加
                            </Button>
                        </Box>

                        {supporters.map((supporter, index) => (
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
                        ))}
                        {supporters.length === 0 && (
                            <Typography variant="body2" color="text.secondary" align="center" sx={{ py: 2 }}>
                                支援役が追加されていません
                            </Typography>
                        )}
                    </Paper>
                </Box>

                <Box sx={{ flex: { xs: '1 1 100%', md: '1 1 auto' } }}>
                    {results ? (
                        <BuffResult results={results} />
                    ) : (
                        <Paper sx={{ p: 4, textAlign: 'center', bgcolor: '#f5f5f5', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography color="text.secondary">
                                攻撃役を選択すると結果が表示されます
                            </Typography>
                        </Paper>
                    )}
                </Box>
            </Box>
        </Box>
    );
};
