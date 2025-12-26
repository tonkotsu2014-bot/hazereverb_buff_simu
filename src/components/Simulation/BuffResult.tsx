import React from 'react';
import { Card, CardContent, Typography, Divider, Box, Table, TableBody, TableCell, TableContainer, TableHead, TableRow, Paper, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import type { CalculatedBuffs } from '../../logic/buffCalculation';

interface BuffResultProps {
    results: CalculatedBuffs;
    onToggleBuff: (id: string | string[]) => void;
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
    Armor: '装甲',
    HyperCritDamage: '超クリダメ'
};

export const BuffResult: React.FC<BuffResultProps> = ({ results, onToggleBuff }) => {
    const formatPercent = (val: number) => `${val.toFixed(2)}%`;

    return (
        <Card sx={{ mt: 3, bgcolor: '#f5f5f5' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                    シミュレーション結果
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2, mb: 4 }}>
                    <Box sx={{ flex: '1 1 auto', minWidth: '120px' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            攻撃力上昇
                        </Typography>
                        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }} color="success.main">
                            +{formatPercent(results.attackIncreasePercent)}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: '1 1 auto', minWidth: '120px' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            会心率 (合計)
                        </Typography>
                        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                            {formatPercent(results.critRateTotal)}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: '1 1 auto', minWidth: '120px' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            会心ダメージ (合計)
                        </Typography>
                        <Typography variant="h4" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>
                            {formatPercent(results.critDamageTotal)}
                        </Typography>
                        {results.hyperCritDamageBuff > 0 && (
                            <Typography variant="caption" display="block" color="text.secondary">
                                (通常: {formatPercent(results.critDamageTotal - results.hyperCritDamageBuff)} + ハイパー: {formatPercent(results.hyperCritDamageBuff)})
                            </Typography>
                        )}
                    </Box>
                </Box>

                <Box sx={{ mb: 4, px: 2, py: 1, bgcolor: '#fff3e0', borderRadius: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                        ※ゲーム内上限: 攻撃力:+200%, 会心率:100%, 会心ダメージ:1000%+ハイパークリティカルダメージ
                    </Typography>
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 2, mb: 1 }}>
                    <Typography variant="subtitle1" fontWeight="bold">
                        適用された効果詳細
                    </Typography>
                    <Tooltip title="表示されている行をクリックすると、その効果の有効/無効を切り替えられます。" arrow>
                        <HelpOutlineIcon fontSize="small" color="action" sx={{ cursor: 'help', opacity: 0.7 }} />
                    </Tooltip>
                </Box>
                <TableContainer component={Paper} elevation={0} sx={{ bgcolor: 'transparent', maxWidth: '100%', overflowX: 'auto' }}>
                    <Table size="small" aria-label="buff modifiers table">
                        <TableHead>
                            <TableRow>
                                <TableCell>対象 / ソース</TableCell>
                                <TableCell>スキル</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>攻撃</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>会心率</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>会心ダメ</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>超クリダメ</TableCell>
                                <TableCell align="right" sx={{ whiteSpace: 'nowrap' }}>その他</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {(() => {
                                // Group modifiers by Source + Skill Name + Level
                                const groupedMods: Record<string, typeof results.modifiers> = {};
                                results.modifiers.forEach(mod => {
                                    const key = `${mod.sourceCharacterName}-${mod.skillName}-${mod.skillLevel}`;
                                    if (!groupedMods[key]) groupedMods[key] = [];
                                    groupedMods[key].push(mod);
                                });

                                const groups = Object.entries(groupedMods);

                                if (groups.length === 0) {
                                    return (
                                        <TableRow>
                                            <TableCell colSpan={6} align="center" sx={{ py: 3, color: 'text.secondary' }}>
                                                適用された効果はありません
                                            </TableCell>
                                        </TableRow>
                                    );
                                }

                                return groups.map(([key, mods]) => {
                                    const first = mods[0];
                                    // Determine group active state: active if ALL are active? Or ANY?
                                    // Since toggling operates on the set, if we click a row, we want to toggle all.
                                    // If currently Mixed, toggle should probably Disable All or Enable All.
                                    // Let's rely on simple toggle logic: if we consider the row "Active", click should Disable.
                                    // Consider Active if at least one is active.
                                    const isGroupActive = mods.some(m => m.isActive);

                                    // Aggregate values
                                    let attackVal = 0;
                                    let critRateVal = 0;
                                    let critDamageVal = 0;
                                    let hyperCritDamageVal = 0;
                                    const others: string[] = [];

                                    mods.forEach(m => {
                                        if (m.attribute === 'Attack') attackVal += m.value;
                                        else if (m.attribute === 'CritRate') critRateVal += m.value;
                                        else if (m.attribute === 'CritDamage') critDamageVal += m.value;
                                        else if (m.attribute === 'HyperCritDamage') hyperCritDamageVal += m.value;
                                        else {
                                            // Format other attributes
                                            const label = attributeMap[m.attribute] || m.attribute;
                                            const valStr = m.value > 0 ? `+${m.value.toFixed(2)}` : m.value.toFixed(2);
                                            others.push(`${label} ${valStr}`);
                                        }
                                    });

                                    // Filter out logs that don't contribute to Attack, CritRate, CritDamage, or HyperCritDamage
                                    if (Math.abs(attackVal) < 0.001 && Math.abs(critRateVal) < 0.001 && Math.abs(critDamageVal) < 0.001 && Math.abs(hyperCritDamageVal) < 0.001) {
                                        return null;
                                    }

                                    // Local click handler to toggle all IDs
                                    const handleRowClick = () => {
                                        // If we want to strictly Sync them:
                                        // If isGroupActive is true (some are on), we want to turn ALL OFF.
                                        // If isGroupActive is false (all are off), we want to turn ALL ON.

                                        // The parent 'handleToggleBuff' toggles existence in the set (Active -> Inactive).
                                        // If we pass IDs that are currently Active, they become Inactive.
                                        // If we pass IDs that are Inactive, they become Active.

                                        // So we should identify which IDs need to change to match the target state.
                                        // Target State: !isGroupActive

                                        const idsToToggle: string[] = [];
                                        mods.forEach(m => {
                                            // If we want to reach Target State (e.g. False), and m.isActive is True, we toggle it.
                                            // If m.isActive is False, we leave it (already match).
                                            if (m.isActive !== !isGroupActive) {
                                                idsToToggle.push(m.id);
                                            }
                                        });

                                        if (idsToToggle.length > 0) {
                                            onToggleBuff(idsToToggle);
                                        }
                                    };

                                    return (
                                        <TableRow
                                            key={key}
                                            onClick={handleRowClick}
                                            sx={{
                                                cursor: 'pointer',
                                                transition: 'all 0.2s',
                                                opacity: isGroupActive ? 1 : 0.5,
                                                filter: isGroupActive ? 'none' : 'grayscale(100%)',
                                                bgcolor: isGroupActive ? 'transparent' : 'action.hover',
                                                '&:hover': { bgcolor: 'action.hover' }
                                            }}
                                        >
                                            <TableCell component="th" scope="row">
                                                <Typography variant="body2" sx={{ fontSize: '0.85em' }}>
                                                    {first.sourceCharacterName}
                                                </Typography>
                                            </TableCell>
                                            <TableCell>
                                                <Tooltip title={<Typography variant="body2">{first.description || 'No description'}</Typography>} arrow>
                                                    <Typography component="span" sx={{ borderBottom: '1px dotted', fontSize: '0.85em' }}>
                                                        {first.skillName} {first.skillLevel && `(${first.skillLevel})`}
                                                        {first.stackCount && first.stackCount > 1 && (
                                                            <Box component="span" sx={{ color: 'text.secondary', ml: 1, fontSize: '0.85em' }}>
                                                                ×{first.stackCount}
                                                            </Box>
                                                        )}
                                                    </Typography>
                                                </Tooltip>
                                            </TableCell>

                                            <TableCell align="right" sx={{
                                                color: attackVal > 0 ? 'success.main' : attackVal < 0 ? 'error.main' : 'text.disabled',
                                                fontWeight: attackVal ? 'bold' : 'normal'
                                            }}>
                                                {attackVal ? (attackVal > 0 ? `+${attackVal.toFixed(2)}` : attackVal.toFixed(2)) : '-'}
                                            </TableCell>
                                            <TableCell align="right" sx={{
                                                color: critRateVal > 0 ? 'success.main' : critRateVal < 0 ? 'error.main' : 'text.disabled',
                                                fontWeight: critRateVal ? 'bold' : 'normal'
                                            }}>
                                                {critRateVal ? (critRateVal > 0 ? `+${critRateVal.toFixed(2)}` : critRateVal.toFixed(2)) : '-'}
                                            </TableCell>
                                            <TableCell align="right" sx={{
                                                color: critDamageVal > 0 ? 'success.main' : critDamageVal < 0 ? 'error.main' : 'text.disabled',
                                                fontWeight: critDamageVal ? 'bold' : 'normal'
                                            }}>
                                                {critDamageVal ? (critDamageVal > 0 ? `+${critDamageVal.toFixed(2)}` : critDamageVal.toFixed(2)) : '-'}
                                            </TableCell>
                                            <TableCell align="right" sx={{
                                                color: hyperCritDamageVal > 0 ? 'success.main' : hyperCritDamageVal < 0 ? 'error.main' : 'text.disabled',
                                                fontWeight: hyperCritDamageVal ? 'bold' : 'normal'
                                            }}>
                                                {hyperCritDamageVal ? (hyperCritDamageVal > 0 ? `+${hyperCritDamageVal.toFixed(2)}` : hyperCritDamageVal.toFixed(2)) : '-'}
                                            </TableCell>
                                            <TableCell align="right" sx={{ fontSize: '0.85em', color: 'text.secondary' }}>
                                                {others.length > 0 ? others.join(', ') : '-'}
                                            </TableCell>
                                        </TableRow>
                                    );
                                });
                            })()}
                        </TableBody>
                    </Table>
                </TableContainer>


            </CardContent>
        </Card>
    );
};
