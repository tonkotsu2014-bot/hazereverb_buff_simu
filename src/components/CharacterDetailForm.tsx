import React, { useState, useEffect } from 'react';
import type { ParsedCharacterData, SkillEffect } from '../logic/wikiParser';
import {
    Box,
    TextField,
    Typography,
    Paper,
    Grid,
    Divider,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    Stack,
    Accordion,
    AccordionSummary,
    AccordionDetails,
    IconButton,
    Button,
    Checkbox,
    FormControlLabel
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Props {
    character: ParsedCharacterData;
    onUpdate: (updated: ParsedCharacterData) => void;
}

export const CharacterDetailForm: React.FC<Props> = ({ character, onUpdate }) => {
    // Clone character for local editing to avoid direct mutation/lag
    const [formData, setFormData] = useState<ParsedCharacterData>(character);
    const [selectedLevels, setSelectedLevels] = useState<{ [key: number]: number }>({});

    // Dynamic label generation
    const getStatLabel = (key: string, role?: string) => {
        let label = '';
        switch (key) {
            case 'hp': label = 'HP'; break;
            case 'attack': label = role === 'Supporter' ? '支援力' : '攻撃力'; break;
            case 'defense': label = '防御力'; break;
            case 'critRate': label = 'クリティカル率'; break;
            case 'critDamage': label = 'クリティカルダメージ'; break;
            case 'speed': label = '機動力'; break;
            default: label = key;
        }

        if (['critRate', 'critDamage', 'defense', 'speed'].includes(key) || (key === 'attack' && role === 'Supporter')) {
            label += ' (%)';
        }
        return label;
    };

    useEffect(() => {
        setFormData(character);
    }, [character]);

    const handleChangeBasic = (field: keyof ParsedCharacterData, value: any) => {
        const updated = { ...formData, [field]: value };
        setFormData(updated);
        onUpdate(updated);
    };

    const handleChangeStat = (statName: string, value: string) => {
        const numValue = parseInt(value) || 0;
        const updated = {
            ...formData,
            stats: {
                ...formData.stats,
                [statName]: numValue
            }
        };
        setFormData(updated);
        onUpdate(updated);
    };

    const handleLevelChange = (skillIndex: number, newLevelIndex: number) => {
        setSelectedLevels(prev => ({
            ...prev,
            [skillIndex]: newLevelIndex
        }));
    };

    const handleAddEffect = (skillIndex: number, levelIndex: number) => {
        const newSkills = [...formData.skills];
        const newLevels = [...newSkills[skillIndex].levels];
        const newEffects = [
            ...newLevels[levelIndex].effects,
            {
                type: 'Buff',
                attribute: 'Attack',
                value: 0,
                duration: 1,
                calculationType: 'Fixed',
                target: 'Default'
            } as SkillEffect
        ];
        newLevels[levelIndex] = { ...newLevels[levelIndex], effects: newEffects };
        newSkills[skillIndex] = { ...newSkills[skillIndex], levels: newLevels };

        const updated = { ...formData, skills: newSkills };
        setFormData(updated);
        onUpdate(updated);
    };

    const handleRemoveEffect = (skillIndex: number, levelIndex: number, effectIndex: number) => {
        const newSkills = [...formData.skills];
        const newLevels = [...newSkills[skillIndex].levels];
        const newEffects = newLevels[levelIndex].effects.filter((_, idx) => idx !== effectIndex);

        newLevels[levelIndex] = { ...newLevels[levelIndex], effects: newEffects };
        newSkills[skillIndex] = { ...newSkills[skillIndex], levels: newLevels };

        const updated = { ...formData, skills: newSkills };
        setFormData(updated);
        onUpdate(updated);
    };

    // Helper to update a specific effect in a specific skill level
    const updateEffect = (skillIndex: number, levelIndex: number, effectIndex: number, field: keyof SkillEffect, value: any) => {
        const newSkills = [...formData.skills];
        const newLevels = [...newSkills[skillIndex].levels];
        const newEffects = [...newLevels[levelIndex].effects];

        newEffects[effectIndex] = { ...newEffects[effectIndex], [field]: value };
        newLevels[levelIndex] = { ...newLevels[levelIndex], effects: newEffects };
        newSkills[skillIndex] = { ...newSkills[skillIndex], levels: newLevels };

        const updated = { ...formData, skills: newSkills };
        setFormData(updated);
        onUpdate(updated);
    };

    return (
        <Paper sx={{ p: 3, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
            <Typography variant="h5" gutterBottom color="primary">
                {formData.name || '名称不明'}
            </Typography>

            <Grid container spacing={3} sx={{ mb: 4 }}>
                <Grid size={{ xs: 12, md: 6 }}>
                    <TextField
                        fullWidth
                        label="名前"
                        value={formData.name}
                        onChange={(e) => handleChangeBasic('name', e.target.value)}
                    />
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <FormControl fullWidth>
                        <InputLabel>役割</InputLabel>
                        <Select
                            value={formData.role ?? ''}
                            label="役割"
                            onChange={(e) => handleChangeBasic('role', e.target.value)}
                        >
                            <MenuItem value="Attacker">攻撃型</MenuItem>
                            <MenuItem value="Supporter">支援型</MenuItem>
                            <MenuItem value="Defender">防御型</MenuItem>
                            <MenuItem value="Transcendence">超越型</MenuItem>
                            <MenuItem value="Firepower">火力型</MenuItem>
                        </Select>
                    </FormControl>
                </Grid>
                <Grid size={{ xs: 6, md: 3 }}>
                    <Stack direction="row" spacing={1}>
                        <TextField
                            label="配置列"
                            type="number"
                            value={formData.attackRange?.row ?? 1}
                            onChange={(e) => handleChangeBasic('attackRange', { ...formData.attackRange, row: parseInt(e.target.value) || 1 })}
                            inputProps={{ min: 1, max: 3 }}
                        />
                        <TextField
                            label="射程"
                            type="number"
                            value={formData.attackRange?.col ?? 1}
                            onChange={(e) => handleChangeBasic('attackRange', { ...formData.attackRange, col: parseInt(e.target.value) || 1 })}
                            inputProps={{ min: 1, max: 6 }}
                        />
                    </Stack>
                </Grid>
            </Grid>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>ステータス</Typography>
            <Grid container spacing={2} sx={{ mb: 4 }}>
                {Object.entries(formData.stats || {}).map(([key, val]) => (
                    <Grid size={{ xs: 6, sm: 4, md: 3 }} key={key}>
                        <TextField
                            fullWidth
                            label={getStatLabel(key, formData.role)}
                            type="number"
                            value={val}
                            onChange={(e) => handleChangeStat(key, e.target.value)}
                            size="small"
                        />
                    </Grid>
                ))}
            </Grid>

            <Divider sx={{ mb: 2 }} />
            <Typography variant="h6" gutterBottom>スキル</Typography>
            <Box>
                {formData.skills.map((skill, sIdx) => {
                    // Filter levels to only those with descriptions
                    const availableLevels = skill.levels
                        .map((lvl, idx) => ({ ...lvl, originalIndex: idx }))
                        .filter(lvl => lvl.description);

                    // Determine current level index. Default to the first available level if no selection or invalid selection.
                    const selected = selectedLevels[sIdx];
                    const defaultLevelIndex = availableLevels.length > 0 ? availableLevels[0].originalIndex : 0;
                    const levelIndex = (selected !== undefined && availableLevels.some(l => l.originalIndex === selected))
                        ? selected
                        : defaultLevelIndex;

                    const level = skill.levels[levelIndex];

                    if (!level) return null;

                    return (
                        <Accordion key={sIdx} defaultExpanded={sIdx === 0}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography fontWeight="bold">{skill.name} (Lvl {level.level})</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
                                <Box sx={{ mb: 2, display: 'flex', justifyContent: 'flex-end' }}>
                                    <FormControl size="small" sx={{ minWidth: 120 }}>
                                        <InputLabel>Level</InputLabel>
                                        <Select
                                            value={levelIndex}
                                            label="Level"
                                            onChange={(e) => handleLevelChange(sIdx, Number(e.target.value))}
                                        >
                                            {availableLevels.map((lvl) => (
                                                <MenuItem key={lvl.originalIndex} value={lvl.originalIndex}>
                                                    Level {lvl.level}
                                                </MenuItem>
                                            ))}
                                        </Select>
                                    </FormControl>
                                </Box>
                                {level.description && (
                                    <Box sx={{ mb: 2, p: 2, bgcolor: 'grey.50', borderRadius: 1, border: '1px solid', borderColor: 'divider' }}>
                                        <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'pre-wrap' }}>
                                            {level.description}
                                        </Typography>
                                    </Box>
                                )}
                                <Typography variant="subtitle2" gutterBottom>効果</Typography>
                                {level.effects.map((effect, eIdx) => (
                                    <Grid container spacing={1} key={eIdx} sx={{ mb: 2, alignItems: 'center', bgcolor: 'action.hover', p: 1, borderRadius: 1 }}>
                                        <Grid size={{ xs: 6, md: 2 }}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>タイプ</InputLabel>
                                                <Select
                                                    value={effect.type}
                                                    label="タイプ"
                                                    onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'type', e.target.value)}
                                                >
                                                    <MenuItem value="Buff">バフ</MenuItem>
                                                    <MenuItem value="Debuff">デバフ</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 2 }}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>計算</InputLabel>
                                                <Select
                                                    value={effect.calculationType || 'Fixed'}
                                                    label="計算"
                                                    onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'calculationType', e.target.value)}
                                                >
                                                    <MenuItem value="Fixed">固定値</MenuItem>
                                                    <MenuItem value="Scaling">係数</MenuItem>
                                                    <MenuItem value="SupportScaling">支援力</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 2 }}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>対象</InputLabel>
                                                <Select
                                                    value={effect.attribute}
                                                    label="対象"
                                                    onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'attribute', e.target.value)}
                                                >
                                                    <MenuItem value="Attack">攻撃力</MenuItem>
                                                    <MenuItem value="Armor">装甲</MenuItem>
                                                    <MenuItem value="CritRate">クリティカル率</MenuItem>
                                                    <MenuItem value="CritDamage">クリティカルダメージ</MenuItem>
                                                    <MenuItem value="Mobility">機動力</MenuItem>
                                                    <MenuItem value="Support">支援力</MenuItem>
                                                    <MenuItem value="Shield">シールド</MenuItem>
                                                    <MenuItem value="MaxHP">最大HP</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 2 }}>
                                            <FormControl fullWidth size="small">
                                                <InputLabel>対象</InputLabel>
                                                <Select
                                                    value={effect.target || 'Default'}
                                                    label="対象"
                                                    onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'target', e.target.value)}
                                                >
                                                    <MenuItem value="Default">標準</MenuItem>
                                                    <MenuItem value="Self">自身</MenuItem>
                                                    <MenuItem value="AllAllies">味方全員</MenuItem>
                                                </Select>
                                            </FormControl>
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 2 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="値"
                                                type="number"
                                                value={effect.value}
                                                onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'value', parseFloat(e.target.value))}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 1 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="持続"
                                                type="number"
                                                value={effect.duration}
                                                onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'duration', parseInt(e.target.value))}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 6, md: 1 }}>
                                            <FormControlLabel
                                                control={
                                                    <Checkbox
                                                        checked={!!effect.isStackable}
                                                        onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'isStackable', e.target.checked)}
                                                        size="small"
                                                    />
                                                }
                                                label="スタック"
                                            />
                                        </Grid>
                                        <Grid size="auto">
                                            <IconButton
                                                size="small"
                                                color="error"
                                                onClick={() => handleRemoveEffect(sIdx, levelIndex, eIdx)}
                                            >
                                                <DeleteIcon />
                                            </IconButton>
                                        </Grid>
                                    </Grid>
                                ))}
                                <Button
                                    startIcon={<AddIcon />}
                                    size="small"
                                    onClick={() => handleAddEffect(sIdx, levelIndex)}
                                    sx={{ mt: 1 }}
                                >
                                    効果を追加
                                </Button>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Box >
        </Paper >
    );
};
