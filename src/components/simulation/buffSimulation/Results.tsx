import React from 'react';
import { Box, Typography, Card, CardContent, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Checkbox, Paper, Chip } from '@mui/material';
import type { CalculatedBuffs } from '../../../logic/buffCalculation';

interface ResultsProps {
    results: CalculatedBuffs | null;
    onToggleBuff: (buffId: string | string[]) => void;
}

export const Results: React.FC<ResultsProps> = ({ results, onToggleBuff }) => {
    if (!results) {
        return (
            <Card variant="outlined" sx={{ height: '100%', minHeight: 100, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <CardContent>
                    <Typography color="text.secondary">
                        Select an attacker to see results.
                    </Typography>
                </CardContent>
            </Card>
        );
    }

    const { attackIncreasePercent, critRateTotal, critDamageTotal, hyperCritDamageBuff, modifiers } = results;

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
            <Card variant="outlined" sx={{ bgcolor: 'primary.light', color: 'primary.contrastText' }}>
                <CardContent>
                    <Typography variant="h6" gutterBottom color="inherit">
                        Total Buffs
                    </Typography>
                    <Box sx={{ display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 2 }}>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" display="block">Attack Increase</Typography>
                            <Typography variant="h5" fontWeight="bold">+{attackIncreasePercent.toFixed(2)}%</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" display="block">Total Crit Rate</Typography>
                            <Typography variant="h5" fontWeight="bold">{critRateTotal.toFixed(2)}%</Typography>
                        </Box>
                        <Box sx={{ textAlign: 'center' }}>
                            <Typography variant="caption" display="block">Total Crit Damage</Typography>
                            <Typography variant="h5" fontWeight="bold">{critDamageTotal.toFixed(2)}%</Typography>
                            {hyperCritDamageBuff > 0 && (
                                <Typography variant="caption" display="block">(Inc. +{hyperCritDamageBuff}% Hyper)</Typography>
                            )}
                        </Box>
                    </Box>
                </CardContent>
            </Card>

            <TableContainer component={Paper} variant="outlined" sx={{ maxHeight: 600 }}>
                <Table size="small" stickyHeader>
                    <TableHead>
                        <TableRow>
                            <TableCell padding="checkbox">Active</TableCell>
                            <TableCell>Source</TableCell>
                            <TableCell>Skill</TableCell>
                            <TableCell>Effect</TableCell>
                            <TableCell align="right">Value</TableCell>
                        </TableRow>
                    </TableHead>
                    <TableBody>
                        {modifiers.map((mod) => (
                            <TableRow key={mod.id} hover>
                                <TableCell padding="checkbox">
                                    <Checkbox
                                        checked={mod.isActive}
                                        onChange={() => onToggleBuff(mod.id)}
                                        size="small"
                                    />
                                </TableCell>
                                <TableCell>
                                    <Typography variant="body2">{mod.sourceCharacterName}</Typography>
                                </TableCell>
                                <TableCell>
                                    <Box>
                                        <Typography variant="body2">{mod.skillName}</Typography>
                                        <Typography variant="caption" color="text.secondary">{mod.skillLevel}</Typography>
                                    </Box>
                                </TableCell>
                                <TableCell>
                                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5, flexWrap: 'wrap' }}>
                                        <Typography variant="body2">
                                            {mod.attribute} {mod.effectType}
                                        </Typography>
                                        {mod.stackCount && (
                                            <Chip label={`${mod.stackCount} stacks`} size="small" variant="outlined" sx={{ height: 20, fontSize: '0.7rem' }} />
                                        )}
                                        {mod.description && (
                                            <Typography variant="caption" color="text.secondary" sx={{ width: '100%' }}>
                                                {mod.description.substring(0, 50)}{mod.description.length > 50 ? '...' : ''}
                                            </Typography>
                                        )}
                                    </Box>
                                </TableCell>
                                <TableCell align="right">
                                    <Typography variant="body2" fontWeight="medium" color={mod.effectType === 'Debuff' ? 'error.main' : 'success.main'}>
                                        {mod.value > 0 ? '+' : ''}{mod.value.toFixed(1)}%
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        ))}
                        {modifiers.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={5} align="center">
                                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                                        No active buffs/debuffs found based on current configuration.
                                    </Typography>
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </TableContainer>
        </Box>
    );
};
