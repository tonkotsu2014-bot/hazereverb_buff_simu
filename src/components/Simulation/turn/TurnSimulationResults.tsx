import React, { useState } from 'react';
import {
    Box,
    Typography,
    Paper,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    Tabs,
    Tab,
} from '@mui/material';
import { SimulationResultGraph, ATTRIBUTE_TRANSLATION } from '../SimulationResultGraph';
import type { Action, ReceivedSkill } from '../../../logic/turnSimulator';
import type { PartyMember } from './PartyConfigurationPanel';

interface TurnSimulationResultsProps {
    results: Action[] | null;
    error: string | null;
    party: PartyMember[];
}

export const TurnSimulationResults: React.FC<TurnSimulationResultsProps> = ({
    results,
    error,
    party
}) => {
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState<ReceivedSkill[]>([]);
    const [selectedTurnInfo, setSelectedTurnInfo] = useState<{ round: number; turn: number } | null>(null);
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

    const handleRowClick = (skills: ReceivedSkill[], round: number, turn: number) => {
        if (skills.length > 0) {
            setSelectedSkills(skills);
            setSelectedTurnInfo({ round, turn });
            setDialogOpen(true);
        }
    };

    const handleCloseDialog = () => {
        setDialogOpen(false);
        setSelectedSkills([]);
        // Keep selectedTurnInfo so highlight persists on graph
    };

    return (
        <Box sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
            {error && (
                <Paper sx={{ p: 2, bgcolor: '#ffebee', color: '#c62828', mb: 2 }}>
                    <Typography variant="body2">{error}</Typography>
                </Paper>
            )}

            {results ? (
                <>
                    <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto', maxHeight: '400px', mb: 2 }}>
                        <Table stickyHeader size="small">
                            <TableHead>
                                <TableRow>
                                    <TableCell>Round</TableCell>
                                    <TableCell>Total Turn</TableCell>
                                    <TableCell>Actor</TableCell>
                                </TableRow>
                            </TableHead>
                            <TableBody>
                                {results.map((action, idx) => {
                                    const isRoundStart = idx === 0 || action.round !== results[idx - 1].round;
                                    let rowSpan = 0;
                                    if (isRoundStart) {
                                        rowSpan = 1;
                                        for (let i = idx + 1; i < results.length; i++) {
                                            if (results[i].round === action.round) {
                                                rowSpan++;
                                            } else {
                                                break;
                                            }
                                        }
                                    }

                                    return (
                                        <TableRow
                                            key={idx}
                                            hover
                                            sx={{
                                                bgcolor: action.actorName === 'Boss' ? '#fff3e0' : 'inherit',
                                                cursor: action.actorId ? 'pointer' : 'default',
                                                '&:hover': action.actorId ? { bgcolor: 'action.hover' } : {}
                                            }}
                                            onClick={() => {
                                                if (action.actorId) {
                                                    setSelectedCharacterId(action.actorId);
                                                }
                                                // Always highlight the clicked turn on the graph
                                                setSelectedTurnInfo({ round: action.round, turn: action.globalTurn });
                                            }}
                                        >
                                            {isRoundStart && (
                                                <TableCell
                                                    rowSpan={rowSpan}
                                                    sx={{
                                                        verticalAlign: 'top',
                                                        bgcolor: '#fafafa',
                                                        borderRight: '1px solid #e0e0e0'
                                                    }}
                                                >
                                                    {action.round}
                                                </TableCell>
                                            )}
                                            <TableCell>{action.globalTurn}</TableCell>
                                            <TableCell>
                                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                                                    {action.actorType && (
                                                        <Box
                                                            component="span"
                                                            sx={{
                                                                fontSize: '0.7rem',
                                                                px: 0.8,
                                                                py: 0.2,
                                                                borderRadius: '4px',
                                                                bgcolor: '#fff',
                                                                border: '1px solid',
                                                                borderColor: (() => {
                                                                    switch (action.actorRole) {
                                                                        case 'Supporter': return '#2e7d32';
                                                                        case 'Attacker': return '#d32f2f';
                                                                        case 'Defender': return '#1565c0';
                                                                        case 'Transcendence': return '#424242';
                                                                        case 'Boss': return '#e65100';
                                                                        case 'System': return '#607d8b';
                                                                        default: return '#757575';
                                                                    }
                                                                })(),
                                                                color: (() => {
                                                                    switch (action.actorRole) {
                                                                        case 'Supporter': return '#2e7d32';
                                                                        case 'Attacker': return '#d32f2f';
                                                                        case 'Defender': return '#1565c0';
                                                                        case 'Transcendence': return '#424242';
                                                                        case 'Boss': return '#e65100';
                                                                        case 'System': return '#607d8b';
                                                                        default: return 'text.primary';
                                                                    }
                                                                })(),
                                                                whiteSpace: 'nowrap',
                                                                fontWeight: 'bold'
                                                            }}
                                                        >
                                                            {action.actorType}
                                                        </Box>
                                                    )}
                                                    <Box>
                                                        <Typography
                                                            sx={{
                                                                fontWeight: action.actorName === 'Boss' ? 'bold' : 'normal',
                                                                color: (() => {
                                                                    switch (action.actorRole) {
                                                                        case 'Supporter': return '#2e7d32';
                                                                        case 'Attacker': return '#d32f2f';
                                                                        case 'Defender': return '#1565c0';
                                                                        case 'Transcendence': return '#000000';
                                                                        case 'Boss': return '#e65100';
                                                                        case 'System': return '#607d8b';
                                                                        default: return 'text.primary';
                                                                    }
                                                                })()
                                                            }}
                                                        >
                                                            {action.actorName}
                                                        </Typography>
                                                        {action.supportTargetNames && action.supportTargetNames.length > 0 && (
                                                            <Typography variant="caption" color="text.secondary">
                                                                {`-> ${action.supportTargetNames.join(', ')}`}
                                                            </Typography>
                                                        )}
                                                    </Box>
                                                </Box>
                                            </TableCell>
                                        </TableRow>
                                    );
                                })}
                            </TableBody>
                        </Table>
                    </TableContainer>

                    {/* Skill Detail View - Tabs Top, Content Bottom */}
                    <Paper sx={{ height: '900px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                        <Box sx={{ borderBottom: 1, borderColor: 'divider', bgcolor: '#f5f5f5' }}>
                            <Tabs value={tabValue} onChange={handleTabChange} aria-label="simulation result tabs" centered>
                                <Tab label="推移 (グラフ)" />
                                <Tab label="詳細 (表)" />
                            </Tabs>
                        </Box>

                        <Box sx={{ p: 1, px: 2, display: 'flex', alignItems: 'center', gap: 1, borderBottom: '1px dashed #e0e0e0' }}>
                            <Typography variant="subtitle2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
                                選択中のキャラ:
                            </Typography>
                            <Typography variant="body2" fontWeight={selectedCharacterId ? 'bold' : 'normal'} color={selectedCharacterId ? 'primary' : 'text.secondary'}>
                                {selectedCharacterId
                                    ? party.find(p => p.id === selectedCharacterId)?.name
                                    : '（ターン一覧からキャラクターを選択してください）'}
                            </Typography>
                        </Box>

                        {/* TAB 1: DETAILED TABLE */}
                        <Box role="tabpanel" hidden={tabValue !== 1} sx={{ flex: 1, overflow: 'hidden', display: tabValue === 1 ? 'flex' : 'none', flexDirection: 'column', height: '100%' }}>
                            {tabValue === 1 && (
                                selectedCharacterId ? (
                                    <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                                        <Table stickyHeader size="small">
                                            <TableHead>
                                                <TableRow>
                                                    <TableCell>Round</TableCell>
                                                    <TableCell>Turn</TableCell>
                                                    <TableCell>Context Actor</TableCell>
                                                    <TableCell>効果 (合算)</TableCell>
                                                </TableRow>
                                            </TableHead>
                                            <TableBody>
                                                {(() => {
                                                    const charIndex = party.findIndex(p => p.id === selectedCharacterId);
                                                    if (charIndex === -1) return null;

                                                    return results.map((action, idx) => {
                                                        const state = action.characterStates[charIndex];
                                                        const skills = state ? state.receivedSkills : [];

                                                        // Aggregate effects
                                                        const aggregatedEffects: Record<string, number> = {};
                                                        skills.forEach(skill => {
                                                            skill.effects.forEach(effect => {
                                                                if (aggregatedEffects[effect.attribute] === undefined) {
                                                                    aggregatedEffects[effect.attribute] = 0;
                                                                }
                                                                const val = effect.type === 'Debuff' ? -effect.value : effect.value;
                                                                aggregatedEffects[effect.attribute] += val;
                                                            });
                                                        });

                                                        return (
                                                            <TableRow
                                                                key={idx}
                                                                hover
                                                                onClick={() => handleRowClick(skills, action.round, action.globalTurn)}
                                                                sx={{
                                                                    cursor: skills.length > 0 ? 'pointer' : 'default',
                                                                    '&:hover': skills.length > 0 ? { bgcolor: 'action.hover' } : {}
                                                                }}
                                                            >
                                                                <TableCell>{action.round}</TableCell>
                                                                <TableCell>{action.globalTurn}</TableCell>
                                                                <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                                                    {action.actorName}
                                                                </TableCell>
                                                                <TableCell>
                                                                    <Stack spacing={0.5} direction="row" flexWrap="wrap" gap={0.5}>
                                                                        {Object.keys(aggregatedEffects).length > 0 ? Object.entries(aggregatedEffects).map(([attr, value], sIdx) => {
                                                                            const displayValue = Math.round(value * 100) / 100;
                                                                            const signStr = displayValue > 0 ? '+' : '';
                                                                            const translatedAttr = ATTRIBUTE_TRANSLATION[attr] || attr;
                                                                            const unit = attr === 'Silent' ? '' : '%';
                                                                            const text = `${translatedAttr} ${signStr}${displayValue}${unit}`;

                                                                            return (
                                                                                <Chip
                                                                                    key={sIdx}
                                                                                    label={text}
                                                                                    variant="outlined"
                                                                                    size="small"
                                                                                    sx={{ fontSize: '0.7rem', height: '24px', border: '1px solid #e0e0e0', bgcolor: 'white' }}
                                                                                />
                                                                            );
                                                                        }) : (
                                                                            <Typography variant="caption" color="text.secondary">-</Typography>
                                                                        )}
                                                                    </Stack>
                                                                </TableCell>
                                                            </TableRow>
                                                        );
                                                    });
                                                })()}
                                            </TableBody>
                                        </Table>
                                    </TableContainer>
                                ) : (
                                    <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 1, m: 2 }}>
                                        <Typography color="text.secondary" variant="body2">
                                            履歴を確認したいキャラを選択してください
                                        </Typography>
                                    </Box>
                                )
                            )}
                        </Box>

                        {/* TAB 0: GRAPH */}
                        <Box role="tabpanel" hidden={tabValue !== 0} sx={{ flex: 1, overflow: 'hidden', height: '100%', display: tabValue === 0 ? 'flex' : 'none', flexDirection: 'column' }}>
                            {tabValue === 0 && (
                                <SimulationResultGraph
                                    simulationResults={results}
                                    selectedCharacterId={selectedCharacterId}
                                    party={party.map(p => ({ ...p, name: p.name || 'Unknown' }))}
                                    selectedGlobalTurn={selectedTurnInfo?.turn}
                                />
                            )}
                        </Box>
                    </Paper>

                    {/* Detail Popup */}
                    <Dialog
                        open={dialogOpen}
                        onClose={handleCloseDialog}
                        maxWidth="sm"
                        fullWidth
                        PaperProps={{
                            sx: { height: '80vh', maxHeight: '800px' }
                        }}
                    >
                        <DialogTitle>
                            {selectedTurnInfo && `詳細: R${selectedTurnInfo.round} - Turn ${selectedTurnInfo.turn}`}
                        </DialogTitle>
                        <DialogContent dividers sx={{ p: 0 }}>
                            <List disablePadding dense>
                                {selectedSkills.map((skill, index) => (
                                    <React.Fragment key={index}>
                                        <ListItem sx={{
                                            flexDirection: 'column',
                                            alignItems: 'flex-start',
                                            py: 1,
                                            px: 2,
                                            borderBottom: index < selectedSkills.length - 1 ? '1px solid #eee' : 'none'
                                        }}>
                                            <Box sx={{ display: 'flex', justifyContent: 'space-between', width: '100%', mb: 0.5 }}>
                                                <Typography variant="subtitle2" fontWeight="bold">
                                                    {skill.name}
                                                </Typography>
                                                <Typography variant="caption" color="text.secondary">
                                                    from: {skill.source} (開始: R{skill.startRound} T{skill.startGlobalTurn})
                                                </Typography>
                                            </Box>
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {skill.effects.map((e, eIdx) => {
                                                    const sign = e.type === 'Buff' ? '+' : '-';
                                                    const translatedAttr = ATTRIBUTE_TRANSLATION[e.attribute] || e.attribute;
                                                    const displayValue = Math.round(e.value * 100) / 100;
                                                    const supportInfo = e.actuatorSupportPower ? ` (支援力: ${e.actuatorSupportPower})` : '';
                                                    const durationInfo = e.remainingTurn !== undefined ? (e.remainingTurn === -1 ? ' (永続)' : ` (残: ${e.remainingTurn})`) : '';
                                                    const unit = e.attribute === 'Silent' ? '' : '%';
                                                    return (
                                                        <Chip
                                                            key={eIdx}
                                                            label={`${translatedAttr} ${sign}${displayValue}${unit}${supportInfo}${durationInfo}`}
                                                            size="small"
                                                            variant="outlined"
                                                            sx={{ height: 20, fontSize: '0.65rem' }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        </ListItem>
                                    </React.Fragment>
                                ))}
                            </List>
                        </DialogContent>
                    </Dialog>
                </>
            ) : (
                <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Typography color="text.secondary" variant="body2">
                        シミュレーション開始ボタンを押すと結果が表示されます
                    </Typography>
                </Paper>
            )}
        </Box>
    );
};
