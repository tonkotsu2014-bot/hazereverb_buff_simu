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
    FormControlLabel,
    Card,
    CardContent,
    Chip,
    Tooltip,
    alpha
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import AddIcon from '@mui/icons-material/Add';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import TrendingDownIcon from '@mui/icons-material/TrendingDown';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import LayersIcon from '@mui/icons-material/Layers';

interface Props {
    character: ParsedCharacterData;
    onUpdate: (updated: ParsedCharacterData) => void;
}

const attributeLabels: Record<string, string> = {
    Attack: '攻撃力',
    Armor: '装甲',
    CritRate: 'クリ率',
    CritDamage: 'クリダメ',
    Mobility: '機動力',
    Support: '支援力',
    Shield: 'シールド',
    MaxHP: '最大HP',
    DamageReduction: 'ダメ軽減',
    DamageBoost: 'ダメ増加',
    Evasion: '回避'
};

const targetLabels: Record<string, string> = {
    Default: '標準',
    Self: '自身',
    AllAllies: '味方全体'
};

const calculationTypeLabels: Record<string, string> = {
    Fixed: '固定値',
    Scaling: '係数',
    SupportScaling: '支援力'
};

export const CharacterDetailForm: React.FC<Props> = ({ character, onUpdate }) => {
    const [formData, setFormData] = useState<ParsedCharacterData>(character);
    const [selectedLevels, setSelectedLevels] = useState<{ [key: number]: number }>({});

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

    const getEffectColor = (type: string) => {
        return type === 'Buff' ? 'success' : 'error';
    };

    const getEffectIcon = (type: string) => {
        return type === 'Buff' ? <TrendingUpIcon /> : <TrendingDownIcon />;
    };

    return (
        <Paper sx={{ p: 3, height: '100%', overflow: 'auto', boxSizing: 'border-box' }}>
            <Typography variant="h5" gutterBottom color="primary" fontWeight={700}>
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

            <Divider sx={{ mb: 3 }} />
            <Typography variant="h6" gutterBottom fontWeight={600}>ステータス</Typography>
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

            <Divider sx={{ mb: 3 }} />
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 3 }}>
                <AutoAwesomeIcon color="primary" />
                <Typography variant="h6" fontWeight={600}>スキル効果</Typography>
            </Box>

            <Box>
                {formData.skills.map((skill, sIdx) => {
                    const availableLevels = skill.levels
                        .map((lvl, idx) => ({ ...lvl, originalIndex: idx }))
                        .filter(lvl => lvl.description);

                    const selected = selectedLevels[sIdx];
                    const defaultLevelIndex = availableLevels.length > 0 ? availableLevels[0].originalIndex : 0;
                    const levelIndex = (selected !== undefined && availableLevels.some(l => l.originalIndex === selected))
                        ? selected
                        : defaultLevelIndex;

                    const level = skill.levels[levelIndex];

                    if (!level) return null;

                    const isExSkill = level.level === 'Ex' || level.level === 'EX';

                    return (
                        <Accordion
                            key={sIdx}
                            defaultExpanded={sIdx === 0}
                            sx={{
                                mb: 2,
                                '&:before': { display: 'none' },
                                boxShadow: 2,
                                borderRadius: '8px !important',
                                overflow: 'hidden'
                            }}
                        >
                            <AccordionSummary
                                expandIcon={<ExpandMoreIcon />}
                                sx={{
                                    bgcolor: isExSkill ? alpha('#9c27b0', 0.08) : alpha('#2563eb', 0.04),
                                    '&:hover': {
                                        bgcolor: isExSkill ? alpha('#9c27b0', 0.12) : alpha('#2563eb', 0.08)
                                    }
                                }}
                            >
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
                                    <Typography fontWeight={700} sx={{ flex: 1 }}>
                                        {skill.name}
                                    </Typography>
                                    <Chip
                                        label={`Lv.${level.level}`}
                                        size="small"
                                        color={isExSkill ? 'secondary' : 'primary'}
                                        sx={{ fontWeight: 600 }}
                                    />
                                </Box>
                            </AccordionSummary>
                            <AccordionDetails sx={{ p: 3, bgcolor: 'background.default' }}>
                                <Box sx={{ mb: 3, display: 'flex', justifyContent: 'flex-end' }}>
                                    <FormControl size="small" sx={{ minWidth: 140 }}>
                                        <InputLabel>スキルレベル</InputLabel>
                                        <Select
                                            value={levelIndex}
                                            label="スキルレベル"
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
                                    <Paper
                                        elevation={0}
                                        sx={{
                                            mb: 3,
                                            p: 2.5,
                                            bgcolor: alpha('#f1f5f9', 0.5),
                                            border: '1px solid',
                                            borderColor: 'divider',
                                            borderRadius: 2
                                        }}
                                    >
                                        <Typography variant="caption" color="text.secondary" fontWeight={600} sx={{ mb: 0.5, display: 'block' }}>
                                            スキル説明
                                        </Typography>
                                        <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', lineHeight: 1.7 }}>
                                            {level.description}
                                        </Typography>
                                    </Paper>
                                )}

                                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                        <LayersIcon fontSize="small" color="action" />
                                        <Typography variant="subtitle2" fontWeight={600} color="text.primary">
                                            効果詳細 ({level.effects.length})
                                        </Typography>
                                    </Box>
                                    <Button
                                        startIcon={<AddIcon />}
                                        variant="outlined"
                                        size="small"
                                        onClick={() => handleAddEffect(sIdx, levelIndex)}
                                    >
                                        効果を追加
                                    </Button>
                                </Box>

                                <Stack spacing={2}>
                                    {level.effects.length === 0 ? (
                                        <Paper
                                            elevation={0}
                                            sx={{
                                                p: 4,
                                                textAlign: 'center',
                                                bgcolor: alpha('#f1f5f9', 0.3),
                                                border: '2px dashed',
                                                borderColor: 'divider'
                                            }}
                                        >
                                            <Typography variant="body2" color="text.secondary">
                                                効果が登録されていません
                                            </Typography>
                                        </Paper>
                                    ) : (
                                        level.effects.map((effect, eIdx) => (
                                            <Card
                                                key={eIdx}
                                                elevation={0}
                                                sx={{
                                                    border: '2px solid',
                                                    borderColor: effect.type === 'Buff'
                                                        ? alpha('#22c55e', 0.3)
                                                        : alpha('#ef4444', 0.3),
                                                    bgcolor: effect.type === 'Buff'
                                                        ? alpha('#22c55e', 0.04)
                                                        : alpha('#ef4444', 0.04),
                                                    borderRadius: 2,
                                                    position: 'relative',
                                                    transition: 'all 0.2s',
                                                    '&:hover': {
                                                        boxShadow: 3,
                                                        borderColor: effect.type === 'Buff'
                                                            ? alpha('#22c55e', 0.6)
                                                            : alpha('#ef4444', 0.6)
                                                    }
                                                }}
                                            >
                                                <CardContent sx={{ p: 2.5, '&:last-child': { pb: 2.5 } }}>
                                                    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 2, mb: 2.5 }}>
                                                        <Chip
                                                            icon={getEffectIcon(effect.type)}
                                                            label={effect.type === 'Buff' ? 'バフ' : 'デバフ'}
                                                            color={getEffectColor(effect.type)}
                                                            size="small"
                                                            sx={{ fontWeight: 600 }}
                                                        />
                                                        <Box sx={{ flex: 1 }}>
                                                            <Typography variant="body2" fontWeight={600} color="text.primary">
                                                                {attributeLabels[effect.attribute] || effect.attribute}
                                                            </Typography>
                                                            <Typography variant="caption" color="text.secondary">
                                                                {targetLabels[effect.target || 'Default']} • {calculationTypeLabels[effect.calculationType || 'Fixed']}
                                                            </Typography>
                                                        </Box>
                                                        <Tooltip title="削除">
                                                            <IconButton
                                                                size="small"
                                                                onClick={() => handleRemoveEffect(sIdx, levelIndex, eIdx)}
                                                                sx={{
                                                                    color: 'error.main',
                                                                    '&:hover': { bgcolor: alpha('#ef4444', 0.1) }
                                                                }}
                                                            >
                                                                <DeleteIcon fontSize="small" />
                                                            </IconButton>
                                                        </Tooltip>
                                                    </Box>

                                                    <Grid container spacing={2}>
                                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
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

                                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                            <FormControl fullWidth size="small">
                                                                <InputLabel>対象属性</InputLabel>
                                                                <Select
                                                                    value={effect.attribute}
                                                                    label="対象属性"
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

                                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                            <FormControl fullWidth size="small">
                                                                <InputLabel>計算方法</InputLabel>
                                                                <Select
                                                                    value={effect.calculationType || 'Fixed'}
                                                                    label="計算方法"
                                                                    onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'calculationType', e.target.value)}
                                                                >
                                                                    <MenuItem value="Fixed">固定値</MenuItem>
                                                                    <MenuItem value="Scaling">係数</MenuItem>
                                                                    <MenuItem value="SupportScaling">支援力</MenuItem>
                                                                </Select>
                                                            </FormControl>
                                                        </Grid>

                                                        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
                                                            <FormControl fullWidth size="small">
                                                                <InputLabel>対象範囲</InputLabel>
                                                                <Select
                                                                    value={effect.target || 'Default'}
                                                                    label="対象範囲"
                                                                    onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'target', e.target.value)}
                                                                >
                                                                    <MenuItem value="Default">標準</MenuItem>
                                                                    <MenuItem value="Self">自身</MenuItem>
                                                                    <MenuItem value="AllAllies">味方全員</MenuItem>
                                                                </Select>
                                                            </FormControl>
                                                        </Grid>

                                                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                                                            <TextField
                                                                fullWidth
                                                                size="small"
                                                                label="効果値"
                                                                type="number"
                                                                value={effect.value}
                                                                onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'value', parseFloat(e.target.value))}
                                                                InputProps={{
                                                                    endAdornment: <Typography variant="caption" color="text.secondary">%</Typography>
                                                                }}
                                                            />
                                                        </Grid>

                                                        <Grid size={{ xs: 6, sm: 4, md: 3 }}>
                                                            <Tooltip title="ターン数 (-1 = 永続)">
                                                                <TextField
                                                                    fullWidth
                                                                    size="small"
                                                                    label="持続ターン"
                                                                    type="number"
                                                                    value={effect.duration}
                                                                    onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'duration', parseInt(e.target.value))}
                                                                    InputProps={{
                                                                        endAdornment: <Typography variant="caption" color="text.secondary">T</Typography>
                                                                    }}
                                                                />
                                                            </Tooltip>
                                                        </Grid>

                                                        <Grid size={{ xs: 12, sm: 4, md: 6 }} sx={{ display: 'flex', alignItems: 'center' }}>
                                                            <FormControlLabel
                                                                control={
                                                                    <Checkbox
                                                                        checked={!!effect.isStackable}
                                                                        onChange={(e) => updateEffect(sIdx, levelIndex, eIdx, 'isStackable', e.target.checked)}
                                                                        size="small"
                                                                    />
                                                                }
                                                                label={
                                                                    <Typography variant="body2" fontWeight={500}>
                                                                        スタック可能
                                                                    </Typography>
                                                                }
                                                            />
                                                        </Grid>
                                                    </Grid>
                                                </CardContent>
                                            </Card>
                                        ))
                                    )}
                                </Stack>
                            </AccordionDetails>
                        </Accordion>
                    );
                })}
            </Box>
        </Paper>
    );
};
