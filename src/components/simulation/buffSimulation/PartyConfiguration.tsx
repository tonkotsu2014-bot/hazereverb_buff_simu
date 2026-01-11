import React from 'react';
import { Box, Typography, Card, CardContent, IconButton, TextField, FormControlLabel, Switch, Grid, Select, MenuItem, InputLabel, FormControl } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import type { ParsedCharacterData } from '../../../logic/wikiParser';
import { getStackableSkills } from '../../../logic/buffCalculation';

interface PartyConfigurationProps {
    attacker: ParsedCharacterData | null;
    supporters: (ParsedCharacterData | null)[];
    attackerStats: { critRate: number; critDamage: number };
    activeExSkills: Record<string, boolean>;
    activeSkillLevels: Record<string, string>;
    stackCounts: Record<string, number>;
    onAttackerChange: (attacker: ParsedCharacterData | null) => void;
    onAttackerStatsChange: (stats: { critRate: number; critDamage: number }) => void;
    onSupportersChange: (supporters: (ParsedCharacterData | null)[]) => void;
    onExSkillToggle: (characterName: string, checked: boolean) => void;
    onSkillLevelChange: (charName: string, level: string) => void;
    onStackCountChange: (skillKey: string, count: number) => void;
}

export const PartyConfiguration: React.FC<PartyConfigurationProps> = ({
    attacker,
    supporters,
    attackerStats,
    activeExSkills,
    activeSkillLevels,
    stackCounts,
    onAttackerChange,
    onAttackerStatsChange,
    onSupportersChange,
    onExSkillToggle,
    onSkillLevelChange,
    onStackCountChange
}) => {

    const handleRemoveSupporter = (index: number) => {
        const newSupporters = [...supporters];
        newSupporters.splice(index, 1);
        onSupportersChange(newSupporters);
    };

    const renderSkillConfig = (character: ParsedCharacterData) => {
        if (!character.name) return null;
        const stackableSkills = getStackableSkills(character, activeSkillLevels, activeExSkills);

        return (
            <Box sx={{ mt: 1 }}>
                {/* Ex Skill Toggle */}
                {character.skills.some(s => s.levels.some(l => l.level === 'Ex')) && (
                    <FormControlLabel
                        control={
                            <Switch
                                size="small"
                                checked={activeExSkills[character.name] !== false} // Default true
                                onChange={(e) => onExSkillToggle(character.name!, e.target.checked)}
                            />
                        }
                        label="EX Skill"
                    />
                )}

                {/* Skill Levels and Stacks */}
                {character.skills.map(skill => {
                    const levels = skill.levels.filter(l => l.level !== 'Ex');

                    // If there's only 1 level (or 0) and it's not stackable, nothing to configure for this skill
                    if (levels.length <= 1 && !stackableSkills.some(s => s.name === skill.name)) return null;

                    return (
                        <Box key={skill.name} sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1, flexWrap: 'wrap' }}>
                            {levels.length > 1 && (
                                <FormControl size="small" variant="standard" sx={{ minWidth: 80 }}>
                                    <InputLabel>{skill.name}</InputLabel>
                                    <Select
                                        value={activeSkillLevels[character.name!] || (levels[levels.length - 1]?.level ?? '')}
                                        onChange={(e) => onSkillLevelChange(character.name!, e.target.value)}
                                        label={skill.name}
                                    >
                                        {levels.map(l => (
                                            <MenuItem key={l.level} value={l.level}>{l.level}</MenuItem>
                                        ))}
                                    </Select>
                                </FormControl>
                            )}

                            {stackableSkills.some(s => s.name === skill.name) && (
                                <TextField
                                    label={`${skill.name} Stacks`}
                                    type="number"
                                    size="small"
                                    variant="standard"
                                    value={stackCounts[skill.name] || 1}
                                    onChange={(e) => onStackCountChange(skill.name, parseInt(e.target.value) || 1)}
                                    sx={{ width: 100 }}
                                />
                            )}
                        </Box>
                    );
                })}
            </Box>
        );
    };

    return (
        <Box>
            {/* Attacker Section */}
            <Card variant="outlined" sx={{ mb: 2 }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Attacker (Buff Target)
                    </Typography>
                    {!attacker ? (
                        <Typography variant="body2" color="text.secondary">
                            Select a character from the list on the left to be the attacker.
                        </Typography>
                    ) : (
                        <Box>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    {attacker.name}
                                </Typography>
                                <IconButton size="small" onClick={() => onAttackerChange(null)}>
                                    <CloseIcon />
                                </IconButton>
                            </Box>

                            <Grid container spacing={2} sx={{ mt: 1 }}>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Crit Rate (%)"
                                        type="number"
                                        size="small"
                                        fullWidth
                                        value={attackerStats.critRate}
                                        onChange={(e) => onAttackerStatsChange({ ...attackerStats, critRate: parseFloat(e.target.value) || 0 })}
                                    />
                                </Grid>
                                <Grid item xs={6}>
                                    <TextField
                                        label="Crit Damage (%)"
                                        type="number"
                                        size="small"
                                        fullWidth
                                        value={attackerStats.critDamage}
                                        onChange={(e) => onAttackerStatsChange({ ...attackerStats, critDamage: parseFloat(e.target.value) || 0 })}
                                    />
                                </Grid>
                            </Grid>

                            {renderSkillConfig(attacker)}
                        </Box>
                    )}
                </CardContent>
            </Card>

            {/* Supporters Section */}
            <Card variant="outlined">
                <CardContent>
                    <Typography variant="h6" gutterBottom>
                        Supporters
                    </Typography>
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {supporters.map((supporter, index) => {
                            if (!supporter) return null;
                            return (
                                <Card key={`${supporter.name}-${index}`} variant="elevation" elevation={1}>
                                    <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                            <Typography variant="subtitle2" fontWeight="bold">
                                                {supporter.name}
                                            </Typography>
                                            <IconButton size="small" onClick={() => handleRemoveSupporter(index)}>
                                                <CloseIcon fontSize="small" />
                                            </IconButton>
                                        </Box>
                                        {renderSkillConfig(supporter)}
                                    </CardContent>
                                </Card>
                            );
                        })}
                        {supporters.length === 0 && (
                            <Typography variant="body2" color="text.secondary">
                                Add up to 9 supporters from the list.
                            </Typography>
                        )}
                    </Box>
                </CardContent>
            </Card>
        </Box>
    );
};
