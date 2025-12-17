import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Grid, FormControlLabel, Checkbox, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Button, TextField, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LayersIcon from '@mui/icons-material/Layers';
import { CharacterSelector } from '../components/Simulation/CharacterSelector';
import { CharacterList } from '../components/CharacterList';
import { BuffResult } from '../components/Simulation/BuffResult';
import { calculateMaxBuffs, calculateEffectiveStats, getStackableSkills } from '../logic/buffCalculation';
import type { ParsedCharacterData } from '../logic/wikiParser';

interface BuffSimulationPageProps {
    characters: ParsedCharacterData[];
}

export const BuffSimulationPage: React.FC<BuffSimulationPageProps> = ({ characters }) => {
    const [attacker, setAttacker] = useState<ParsedCharacterData | null>(null);
    const [supporters, setSupporters] = useState<(ParsedCharacterData | null)[]>([]);
    const [activeExSkills, setActiveExSkills] = useState<Record<string, boolean>>({});
    const [activeSkillLevels, setActiveSkillLevels] = useState<Record<string, string>>({});
    const [stackCounts, setStackCounts] = useState<Record<string, number>>({});
    const [configOpen, setConfigOpen] = useState(false);
    const [configTargetIndex, setConfigTargetIndex] = useState<number | null>(null); // Index in supporters array
    const [attackerStats, setAttackerStats] = useState({ critRate: 0, critDamage: 0 }); // Custom stats for attacker

    // Sync state with characters prop to reflect edits
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

    // Initialize stats when attacker changes selection
    useEffect(() => {
        if (attacker && attacker.stats) {
            const stats = attacker.stats as any;
            const getVal = (pascal: string, camel: string) => {
                if (stats[pascal] !== undefined) return typeof stats[pascal] === 'number' ? stats[pascal] : parseFloat(stats[pascal]);
                if (stats[camel] !== undefined) return typeof stats[camel] === 'number' ? stats[camel] : parseFloat(stats[camel]);
                return 0;
            };

            setAttackerStats({
                critRate: getVal('CritRate', 'critRate'),
                critDamage: getVal('CritDamage', 'critDamage')
            });
        }
    }, [attacker?.name]);

    const handleAddSupporter = (index: number) => {
        if (supporters.length < 9) {
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

        // Use custom stats for calculation
        const modifiedAttacker = {
            ...attacker,
            stats: {
                ...attacker.stats,
                CritRate: attackerStats.critRate,
                CritDamage: attackerStats.critDamage,
                critRate: attackerStats.critRate,
                critDamage: attackerStats.critDamage
            } as any
        };

        const activeSupporters = supporters.filter((s): s is ParsedCharacterData => s !== null);
        return calculateMaxBuffs(modifiedAttacker, activeSupporters, stackCounts, activeExSkills, activeSkillLevels);
    }, [attacker, supporters, stackCounts, activeExSkills, activeSkillLevels, attackerStats]);

    // Helper to get Ex toggle state (default true if undefined)
    const isExEnabled = (charName: string | undefined) => {
        if (!charName) return false;
        return activeExSkills[charName] !== false;
    };

    const getEffectiveSupportPower = (supporter: ParsedCharacterData) => {
        const effective = calculateEffectiveStats(supporter, stackCounts, activeExSkills, activeSkillLevels);
        return (effective.stats as any)?.Support || 0;
    };

    const handleOpenConfig = (index: number) => {
        setConfigTargetIndex(index);
        setConfigOpen(true);
    };

    const handleCloseConfig = () => {
        setConfigOpen(false);
        setConfigTargetIndex(null);
    };

    const handleLevelChange = (charName: string, level: string) => {
        setActiveSkillLevels(prev => ({
            ...prev,
            [charName]: level
        }));
    };

    const handleStackChange = (skillKey: string, count: number) => {
        setStackCounts(prev => ({
            ...prev,
            [skillKey]: count
        }));
    };

    const hasStackableSkills = (character: ParsedCharacterData) => {
        return getStackableSkills(character, activeSkillLevels, activeExSkills).length > 0;
    };



    return (
        <Box sx={{ p: 3, maxWidth: 1600, mx: 'auto', height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" gutterBottom>
                バフシミュレーション
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph>
                左側のリストから「＋」ボタンでキャラを追加できます。(最大9人)
            </Typography>

            <Grid container spacing={3} sx={{ flex: 1, overflow: 'hidden' }}>
                {/* Left Column: Character List */}
                <Grid size={{ xs: 12, md: 3 }} sx={{ height: '100%', overflow: 'hidden' }}>
                    <CharacterList
                        characters={characters}
                        onAdd={handleAddSupporter}
                        onSelect={handleAddSupporter}
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
                                            characters={supporters.filter((s): s is ParsedCharacterData =>
                                                s !== null &&
                                                s.role !== 'Supporter' &&
                                                !s.type?.includes('支援')
                                            )}
                                            selectedCharacter={attacker}
                                            onSelect={setAttacker}
                                        />
                                        {attacker && (
                                            <Box sx={{ mt: 2, p: 2, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                                                <Typography variant="subtitle2" gutterBottom>基本ステータス:</Typography>
                                                <Box sx={{ display: 'flex', gap: 2 }}>
                                                    <TextField
                                                        label="会心率 (%)"
                                                        type="number"
                                                        size="small"
                                                        value={attackerStats.critRate}
                                                        onChange={(e) => setAttackerStats(prev => ({ ...prev, critRate: parseFloat(e.target.value) || 0 }))}
                                                        slotProps={{ htmlInput: { step: 0.1 } }}
                                                    />
                                                    <TextField
                                                        label="会心ダメージ (%)"
                                                        type="number"
                                                        size="small"
                                                        value={attackerStats.critDamage}
                                                        onChange={(e) => setAttackerStats(prev => ({ ...prev, critDamage: parseFloat(e.target.value) || 0 }))}
                                                        slotProps={{ htmlInput: { step: 0.1 } }}
                                                    />
                                                </Box>
                                            </Box>
                                        )}
                                    </Box>
                                </Paper>
                            </Box>

                            <Box sx={{ flex: 1, minWidth: 300 }}>
                                <Paper sx={{ p: 3 }}>
                                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                                        <Typography variant="h6">
                                            2. パーティー (Party) {supporters.length}/9
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
                                                                <Typography
                                                                    variant="subtitle2"
                                                                    title={supporter.name}
                                                                    sx={{
                                                                        fontWeight: 'bold',
                                                                        color: (() => {
                                                                            switch (supporter.role) {
                                                                                case 'Supporter': return '#2e7d32'; // Green
                                                                                case 'Attacker': return '#d32f2f'; // Red
                                                                                case 'Defender': return '#1565c0'; // Blue
                                                                                case 'Transcendence': return '#000000'; // Black
                                                                                default: return 'text.primary';
                                                                            }
                                                                        })()
                                                                    }}
                                                                >
                                                                    {supporter.name}
                                                                </Typography>
                                                                {(supporter.role === '支援' || supporter.type?.includes('支援')) && (
                                                                    <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                        支援力: {getEffectiveSupportPower(supporter)}%
                                                                    </Typography>
                                                                )}
                                                                <Typography variant="caption" display="block" color="text.secondary" sx={{ mt: 0.5 }}>
                                                                    スキルレベル {activeSkillLevels[supporter.name || ''] || '10'} {isExEnabled(supporter.name) ? '+ Ex' : ''}
                                                                </Typography>
                                                            </CardContent>
                                                            <Box
                                                                component="div"
                                                                onClick={() => handleOpenConfig(index)}
                                                                sx={{
                                                                    position: 'absolute',
                                                                    top: 0,
                                                                    left: 0,
                                                                    right: 0,
                                                                    bottom: 0,
                                                                    cursor: 'pointer',
                                                                    zIndex: 1
                                                                }}
                                                            />
                                                            <IconButton
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleRemoveSupporter(index);
                                                                }}
                                                                size="small"
                                                                color="default"
                                                                sx={{ position: 'absolute', top: 4, right: 4, zIndex: 2 }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                            {hasStackableSkills(supporter) && (
                                                                <Tooltip title="スタック可能スキル所持">
                                                                    <LayersIcon
                                                                        fontSize="small"
                                                                        color="action"
                                                                        sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2, opacity: 0.6 }}
                                                                    />
                                                                </Tooltip>
                                                            )}
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
            {/* Config Dialog */}
            <Dialog open={configOpen} onClose={handleCloseConfig} maxWidth="xs" fullWidth>
                {configTargetIndex !== null && supporters[configTargetIndex] && (
                    <>
                        <DialogTitle>{supporters[configTargetIndex]?.name} 設定</DialogTitle>
                        <DialogContent>
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
                                <FormControl fullWidth>
                                    <InputLabel>スキルレベル (全スキル共通)</InputLabel>
                                    <Select
                                        value={activeSkillLevels[supporters[configTargetIndex]!.name || ''] || '10'}
                                        label="スキルレベル (全スキル共通)"
                                        onChange={(e) => handleLevelChange(supporters[configTargetIndex]!.name || '', e.target.value)}
                                    >
                                        {[...Array(10)].map((_, i) => (
                                            <MenuItem key={i + 1} value={(i + 1).toString()}>スキルレベル {i + 1}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>

                                <FormControlLabel
                                    control={
                                        <Checkbox
                                            checked={isExEnabled(supporters[configTargetIndex]!.name)}
                                            onChange={(e) => handleToggleExSkill(supporters[configTargetIndex]!.name, e.target.checked)}
                                        />
                                    }
                                    label="Exスキル有効"
                                />

                                {supporters[configTargetIndex] && getStackableSkills(
                                    supporters[configTargetIndex]!,
                                    activeSkillLevels,
                                    activeExSkills
                                ).map(skill => (
                                    <TextField
                                        key={skill.name}
                                        label={`${skill.name} スタック数`}
                                        type="number"
                                        size="small"
                                        value={stackCounts[skill.name] || 1}
                                        onChange={(e) => handleStackChange(skill.name, parseInt(e.target.value) || 1)}
                                        slotProps={{ htmlInput: { min: 1, max: 5 } }}
                                    />
                                ))}
                            </Box>
                        </DialogContent>
                        <DialogActions>
                            <Button onClick={handleCloseConfig}>閉じる</Button>
                        </DialogActions>
                    </>
                )}
            </Dialog>
        </Box>
    );
};
