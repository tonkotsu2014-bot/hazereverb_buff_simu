import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Grid, FormControlLabel, Checkbox, Card, CardContent } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import { CharacterSelector } from '../components/Simulation/CharacterSelector';
import { CharacterList } from '../components/CharacterList';
import { BuffResult } from '../components/Simulation/BuffResult';
import { calculateMaxBuffs, calculateEffectiveStats } from '../logic/buffCalculation';
import type { ParsedCharacterData } from '../logic/wikiParser';

interface BuffSimulationPageProps {
    characters: ParsedCharacterData[];
}

export const BuffSimulationPage: React.FC<BuffSimulationPageProps> = ({ characters }) => {
    const [attacker, setAttacker] = useState<ParsedCharacterData | null>(null);
    const [supporters, setSupporters] = useState<(ParsedCharacterData | null)[]>([]);
    const [activeExSkills, setActiveExSkills] = useState<Record<string, boolean>>({});

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

    const handleRemoveSupporter = (index: number) => {
        setSupporters(supporters.filter((_, i) => i !== index));
    };

    const handleToggleExSkill = (characterName: string | undefined, checked: boolean) => {
        if (!characterName) return;
        setActiveExSkills(prev => ({
            ...prev,
            [characterName]: checked
        }));
    };

    const results = useMemo(() => {
        if (!attacker) return null;
        const activeSupporters = supporters.filter((s): s is ParsedCharacterData => s !== null);
        return calculateMaxBuffs(attacker, activeSupporters, {}, activeExSkills);
    }, [attacker, supporters, activeExSkills]);

    // Helper to get Ex toggle state (default true if undefined)
    const isExEnabled = (charName: string | undefined) => {
        if (!charName) return false;
        return activeExSkills[charName] !== false;
    };

    const getEffectiveSupportPower = (supporter: ParsedCharacterData) => {
        const effective = calculateEffectiveStats(supporter, {}, activeExSkills);
        return effective.stats?.attack || 0;
    };

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
                                    <Box sx={{ mb: 2 }}>
                                        <CharacterSelector
                                            label="攻撃役を選択"
                                            characters={characters}
                                            selectedCharacter={attacker}
                                            onSelect={setAttacker}
                                        />
                                        {attacker && (
                                            <Box sx={{ mt: 1, display: 'flex', alignItems: 'center' }}>
                                                <FormControlLabel
                                                    control={
                                                        <Checkbox
                                                            checked={isExEnabled(attacker.name)}
                                                            onChange={(e) => handleToggleExSkill(attacker.name, e.target.checked)}
                                                            size="small"
                                                        />
                                                    }
                                                    label="Exスキル有効"
                                                />
                                            </Box>
                                        )}
                                    </Box>
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
                                        <Grid container spacing={1}>
                                            {supporters.map((supporter, index) => (
                                                <Grid size={{ xs: 12, sm: 6, lg: 4 }} key={index}>
                                                    {supporter && (
                                                        <Card variant="outlined" sx={{ position: 'relative' }}>
                                                            <CardContent sx={{ pb: '16px !important', pr: 5 }}>
                                                                <Typography variant="subtitle2" title={supporter.name} sx={{ fontWeight: 'bold' }}>
                                                                    {supporter.name}
                                                                </Typography>
                                                                {(supporter.role === '支援' || supporter.type?.includes('支援')) && (
                                                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                        支援力: {getEffectiveSupportPower(supporter)}%
                                                                    </Typography>
                                                                )}
                                                                <Box sx={{ mt: 0.5 }}>
                                                                    <FormControlLabel
                                                                        control={
                                                                            <Checkbox
                                                                                checked={isExEnabled(supporter.name)}
                                                                                onChange={(e) => handleToggleExSkill(supporter.name, e.target.checked)}
                                                                                size="small"
                                                                                sx={{ p: 0.5 }}
                                                                            />
                                                                        }
                                                                        label={<Typography variant="caption">Ex有効</Typography>}
                                                                        sx={{ mr: 0, ml: -0.5 }}
                                                                    />
                                                                </Box>
                                                            </CardContent>
                                                            <IconButton
                                                                onClick={() => handleRemoveSupporter(index)}
                                                                size="small"
                                                                color="default"
                                                                sx={{ position: 'absolute', top: 4, right: 4 }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Card>
                                                    )}
                                                </Grid>
                                            ))}
                                        </Grid>
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
