import React, { useState, useMemo, useEffect } from 'react';
import { Box, Typography, Paper, IconButton, Grid, FormControlLabel, Checkbox, Card, CardContent, Dialog, DialogTitle, DialogContent, DialogActions, FormControl, InputLabel, Select, MenuItem, Button, TextField, Tooltip } from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import LayersIcon from '@mui/icons-material/Layers';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { CharacterSelector } from '../components/Simulation/CharacterSelector';
import { CharacterList } from '../components/CharacterList';
import { BuffResult } from '../components/Simulation/BuffResult';
import { calculateMaxBuffs, calculateEffectiveStats, getStackableSkills } from '../logic/buffCalculation';
import type { ParsedCharacterData } from '../logic/wikiParser';

interface TurnSimulationPageProps {
    characters: ParsedCharacterData[];
}

export const TurnSimulationPage: React.FC<TurnSimulationPageProps> = ({ characters }) => {
    const [attacker, setAttacker] = useState<ParsedCharacterData | null>(null);
    const [supporters, setSupporters] = useState<(ParsedCharacterData | null)[]>([]);
    const [activeExSkills, setActiveExSkills] = useState<Record<string, boolean>>({});
    const [activeSkillLevels, setActiveSkillLevels] = useState<Record<string, string>>({});
    const [stackCounts, setStackCounts] = useState<Record<string, number>>({});
    const [configOpen, setConfigOpen] = useState(false);
    const [configTargetIndex, setConfigTargetIndex] = useState<number | null>(null); // Index in supporters array
    const [attackerStats, setAttackerStats] = useState({ critRate: 0, critDamage: 0 }); // Custom stats for attacker
    const [disabledBuffIds, setDisabledBuffIds] = useState<Set<string>>(new Set());

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

        const activeSupporters = supporters.filter((s): s is ParsedCharacterData => s !== null && s.name !== attacker.name);
        return calculateMaxBuffs(modifiedAttacker, activeSupporters, stackCounts, activeExSkills, activeSkillLevels, disabledBuffIds);
    }, [attacker, supporters, stackCounts, activeExSkills, activeSkillLevels, attackerStats, disabledBuffIds]);

    const handleToggleBuff = (buffId: string | string[]) => {
        setDisabledBuffIds(prev => {
            const next = new Set(prev);
            const ids = Array.isArray(buffId) ? buffId : [buffId];

            // Check if all are currently disabled (if so, we enable all. If mixed or all enabled, we disable all?)
            // Usually simpler: If we are bulk toggling, we check if *any* is enabled -> disable all. 
            // If *all* are disabled -> enable all.
            // But here the input comes from a click.
            // If I click a row that has multiple effects:
            // If the row is considered "active" (at least one active?), clicking should toggle it off?
            // Actually the row state will likely be "Active" if at least one effect is active. 
            // So clicking means "Disable All".
            // If row is "Inactive" (all disabled), clicking means "Enable All".

            // Let's implement this logic in the caller (BuffResult) and pass the explicit intent? 
            // Or just make this a simple "toggle" which flips the state of each ID?
            // No, flipping each individually might lead to weird mixed states if they were already mixed.
            // Better to force strict On/Off based on current state.

            // However, keeping this function simple (just xor existence in set) acts as a toggle.
            // Let's assume the UI sends the IDs to be *toggled*.

            ids.forEach(id => {
                if (next.has(id)) {
                    next.delete(id);
                } else {
                    next.add(id);
                }
            });
            return next;
        });
    };

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

    const handleClearParty = () => {
        setSupporters([]);
    };



    return (
        <Box sx={{ p: 2, height: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" gutterBottom fontWeight={700}>
                ターンシミュレーター
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2 }}>
                左側のリストから「＋」ボタンでキャラを追加できます。(最大9人)
            </Typography>

            <Grid container spacing={2} sx={{ flex: 1, overflow: 'hidden' }}>
                {/* Left Column: Character List */}
                <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%', overflow: 'hidden' }}>
                    <CharacterList
                        characters={characters}
                        onAdd={handleAddSupporter}
                        onSelect={handleAddSupporter}
                    />
                </Grid>

                {/* Right Column: Config & Results */}
                <Grid size={{ xs: 12, md: 8 }} sx={{ height: '100%', overflow: 'auto', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Simulation Config */}
                    <Grid container spacing={2}>
                        {/* Attacker Section - Smaller */}
                        <Grid size={{ xs: 12, sm: 12, lg: 5 }}>
                            <Paper sx={{ p: 2, height: '100%' }}>
                                <Typography variant="subtitle1" gutterBottom fontWeight={600} sx={{ fontSize: '0.95rem' }}>
                                    攻撃役
                                </Typography>
                                <Box sx={{ lg: 1 }}>
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
                                        <Box sx={{ mt: 1.5, p: 1.5, bgcolor: '#f0f9ff', borderRadius: 1 }}>
                                            <Typography variant="caption" fontWeight={600} sx={{ display: 'block', mb: 1, fontSize: '0.75rem' }}>ステータス:</Typography>
                                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                                                <TextField
                                                    label="会心率 (%)"
                                                    type="number"
                                                    size="small"
                                                    value={attackerStats.critRate}
                                                    onChange={(e) => setAttackerStats(prev => ({ ...prev, critRate: parseFloat(e.target.value) || 0 }))}
                                                    slotProps={{ htmlInput: { step: 0.1 } }}
                                                    fullWidth
                                                />
                                                <TextField
                                                    label="会心ダメ (%)"
                                                    type="number"
                                                    size="small"
                                                    value={attackerStats.critDamage}
                                                    onChange={(e) => setAttackerStats(prev => ({ ...prev, critDamage: parseFloat(e.target.value) || 0 }))}
                                                    slotProps={{ htmlInput: { step: 0.1 } }}
                                                    fullWidth
                                                />
                                            </Box>
                                        </Box>
                                    )}
                                </Box>
                            </Paper>
                        </Grid>

                        {/* Party Section - Larger */}
                        <Grid size={{ xs: 12, sm: 12, lg: 7 }}>
                            <Paper sx={{ p: 2, height: '24vh', display: 'flex', flexDirection: 'column' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1.5 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <Typography variant="subtitle1" fontWeight={600} sx={{ fontSize: '0.95rem' }}>
                                            パーティー {supporters.length}/9
                                        </Typography>
                                        <Tooltip title="キャラをクリックすると、スキルレベルや覚醒スキル(Ex)の有効/無効を設定できます。" arrow>
                                            <HelpOutlineIcon fontSize="small" color="action" sx={{ cursor: 'help', opacity: 0.7 }} />
                                        </Tooltip>
                                    </Box>
                                    <Button
                                        size="small"
                                        color="error"
                                        onClick={handleClearParty}
                                        disabled={supporters.length === 0}
                                        sx={{ minWidth: 'auto', p: '2px 8px', fontSize: '0.75rem' }}
                                    >
                                        一括解除
                                    </Button>
                                </Box>

                                {supporters.length === 0 ? (
                                    <Typography variant="caption" color="text.secondary" sx={{ py: 2 }}>
                                        左のリストから追加してください
                                    </Typography>
                                ) : (
                                    <Grid container spacing={1} sx={{ flex: 1, alignContent: 'flex-start', overflowY: 'auto' }}>
                                        {supporters.map((supporter, index) => (
                                            <Grid size={{ xs: 12 }} key={index}>
                                                {supporter && (
                                                    <Card
                                                        variant="outlined"
                                                        sx={{
                                                            position: 'relative',
                                                            width: '100%',
                                                            cursor: 'pointer',
                                                            '&:hover': { bgcolor: 'action.hover' }
                                                        }}
                                                        onClick={() => handleOpenConfig(index)}
                                                    >
                                                        <CardContent
                                                            sx={{
                                                                p: '8px 12px 8px 12px !important',
                                                                pr: '60px !important',
                                                                display: 'flex',
                                                                alignItems: 'center',
                                                                gap: 2
                                                            }}
                                                        >
                                                            {hasStackableSkills(supporter) && (
                                                                <Tooltip title="スタック可能スキル所持">
                                                                    <LayersIcon
                                                                        fontSize="small"
                                                                        color="action"
                                                                        sx={{ opacity: 0.6, fontSize: '1rem' }}
                                                                    />
                                                                </Tooltip>
                                                            )}
                                                            <Typography
                                                                variant="body2"
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
                                                                    })(),
                                                                    whiteSpace: 'nowrap',
                                                                    overflow: 'hidden',
                                                                    textOverflow: 'ellipsis',
                                                                    maxWidth: '56%',
                                                                    fontSize: '0.80rem'
                                                                }}
                                                            >
                                                                {supporter.name}
                                                            </Typography>

                                                            <Box sx={{ flex: 1, display: 'flex', gap: 2, alignItems: 'center' }}>
                                                                {(supporter.role === '支援' || supporter.type?.includes('支援')) && (
                                                                    <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                                                                        支援: {getEffectiveSupportPower(supporter)}%
                                                                    </Typography>
                                                                )}
                                                                <Typography variant="caption" color="text.secondary" sx={{ marginLeft: 'auto', whiteSpace: 'nowrap' }}>
                                                                    Lv {activeSkillLevels[supporter.name || ''] || '10'} {isExEnabled(supporter.name) ? '+EX' : ''}
                                                                </Typography>
                                                            </Box>
                                                        </CardContent>

                                                        <IconButton
                                                            onClick={(e) => {
                                                                e.stopPropagation();
                                                                handleRemoveSupporter(index);
                                                            }}
                                                            size="small"
                                                            color="default"
                                                            sx={{
                                                                position: 'absolute',
                                                                top: '50%',
                                                                right: 4,
                                                                transform: 'translateY(-50%)',
                                                                zIndex: 2
                                                            }}
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
                        </Grid>
                    </Grid>

                    {/* Results */}
                    <Box sx={{ flex: 1, overflow: 'auto' }}>
                        {results ? (
                            <BuffResult results={results} onToggleBuff={handleToggleBuff} />
                        ) : (
                            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5' }}>
                                <Typography color="text.secondary" variant="body2">
                                    攻撃役を選択すると結果が表示されます
                                </Typography>
                            </Paper>
                        )}
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
