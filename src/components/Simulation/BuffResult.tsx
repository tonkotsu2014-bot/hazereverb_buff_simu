import React from 'react';
import { Card, CardContent, Typography, Divider, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper } from '@mui/material';
import type { CalculatedBuffs } from '../../logic/buffCalculation';

interface BuffResultProps {
    results: CalculatedBuffs;
}

const attributeMap: Record<string, string> = {
    Attack: '攻撃力',
    Defense: '防御力',
    Hp: '体力',
    CritRate: '会心率',
    CritDamage: '会心ダメージ',
    Speed: '速度',
    Mobility: '機動力',
    Support: '支援力',
    DamageReduction: 'ダメージ軽減',
    DamageBoost: 'ダメージ増加',
    Armor: '装甲'
};

export const BuffResult: React.FC<BuffResultProps> = ({ results }) => {
    const formatPercent = (val: number) => `${Math.round(val)}%`;

    return (
        <Card sx={{ mt: 3, bgcolor: '#f5f5f5' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                    シミュレーション結果
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
                    <Box sx={{ flex: '1 1 300px' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            攻撃力上昇
                        </Typography>
                        <Typography variant="h4" color="success.main">
                            +{formatPercent(results.attackIncreasePercent)}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: '1 1 300px' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            会心率 (合計)
                        </Typography>
                        <Typography variant="h4">
                            {formatPercent(results.critRateTotal)}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: '1 1 300px' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            会心ダメージ (合計)
                        </Typography>
                        <Typography variant="h4">
                            {formatPercent(results.critDamageTotal)}
                        </Typography>
                    </Box>
                </Box>

                <Typography variant="subtitle1" gutterBottom sx={{ mt: 2, fontWeight: 'bold' }}>
                    適用された効果詳細
                </Typography>
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent' }}>
                    <Table size="small" aria-label="buff modifiers table">
                        <TableHead>
                            <TableRow>
                                <TableCell>対象 / ソース</TableCell>
                                <TableCell>スキル</TableCell>
                                <TableCell>効果</TableCell>
                                <TableCell align="right">値</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {results.modifiers && results.modifiers.length > 0 ? (
                                results.modifiers.map((mod, index) => (
                                    <TableRow key={index} sx={{ '&:last-child td, &:last-child th': { border: 0 } }}>
                                        <TableCell component="th" scope="row">
                                            {mod.sourceCharacterName}
                                        </TableCell>
                                        <TableCell>
                                            {mod.skillName} {mod.skillLevel && `(${mod.skillLevel})`}
                                        </TableCell>
                                        <TableCell>
                                            {mod.effectType === 'Debuff' ? '▼ ' : ''}{attributeMap[mod.attribute] || mod.attribute}
                                        </TableCell>
                                        <TableCell align="right" sx={{ color: mod.value < 0 ? 'error.main' : 'success.main', fontWeight: 'bold' }}>
                                            {mod.value > 0 ? '+' : ''}{mod.value}
                                        </TableCell>
                                    </TableRow>
                                ))
                            ) : (
                                <TableRow>
                                    <TableCell colSpan={4} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                        適用された効果はありません
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </TableContainer>
            </CardContent>
        </Card>
    );
};
