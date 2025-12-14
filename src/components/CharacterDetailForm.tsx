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
    AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface Props {
    character: ParsedCharacterData;
    onUpdate: (updated: ParsedCharacterData) => void;
}

export const CharacterDetailForm: React.FC<Props> = ({ character, onUpdate }) => {
    // Clone character for local editing to avoid direct mutation/lag
    const [formData, setFormData] = useState<ParsedCharacterData>(character);

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
                    // For editing simplicity, we allow editing Level 1 only for now, or the first level found.
                    // In a real app we might want tabs for levels.
                    const levelIndex = 0;
                    const level = skill.levels[levelIndex];

                    if (!level) return null;

                    return (
                        <Accordion key={sIdx} defaultExpanded={sIdx === 0}>
                            <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                                <Typography fontWeight="bold">{skill.name} (Lvl {level.level})</Typography>
                            </AccordionSummary>
                            <AccordionDetails>
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
                                        <Grid size={{ xs: 12, sm: 2 }}>
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
                                        <Grid size={{ xs: 12, sm: 2 }}>
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
                                        <Grid size={{ xs: 6, sm: 2 }}>
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
                                        <Grid size={{ xs: 6, sm: 3 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="値"
                                                type="number"
                                                value={effect.value}
                                                onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'value', parseFloat(e.target.value))}
                                            />
                                        </Grid>
                                        <Grid size={{ xs: 6, sm: 2 }}>
                                            <TextField
                                                fullWidth
                                                size="small"
                                                label="持続"
                                                type="number"
                                                value={effect.duration}
                                                onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'duration', parseInt(e.target.value))}
                                            />
                                        </Grid>
                                    </Grid>
                                ))}
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Box>
        </Paper>
    );
};
