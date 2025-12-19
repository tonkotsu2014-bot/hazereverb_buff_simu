
import React, { useState } from 'react';
import {
    Box,
    Typography,
    Grid,
    Paper,
    Button,
    Card,
    CardContent,
    IconButton,
    TextField,
    TableContainer,
    Table,
    TableHead,
    TableRow,
    TableCell,
    TableBody,
    Select,
    MenuItem,
    FormControl,
    InputLabel,
    OutlinedInput,
    Chip,
    Stack
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { CharacterList } from '../components/CharacterList';
import type { ParsedCharacterData } from '../logic/wikiParser';
import { simulateTurns, type Action } from '../logic/turnSimulator';
import {
    DndContext,
    closestCenter,
    KeyboardSensor,
    PointerSensor,
    useSensor,
    useSensors,
    type DragEndEvent
} from '@dnd-kit/core';
import {
    arrayMove,
    SortableContext,
    sortableKeyboardCoordinates,
    verticalListSortingStrategy,
    useSortable
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface TurnSimulationPageProps {
    characters: ParsedCharacterData[];
}

// Extended type for party members to include UI status
interface PartyMember extends ParsedCharacterData {
    id: string; // Unique ID for DnD key
    deathRound?: string;
    supportTargets?: string[]; // IDs of target characters
}

// Sortable Item Component
const SortableItem = ({
    member,
    index,
    maxRounds,
    party,
    onRemove,
    onDeathChange,
    onSupportTargetsChange
}: {
    member: PartyMember;
    index: number;
    maxRounds: number;
    party: PartyMember[];
    onRemove: (id: string) => void;
    onDeathChange: (id: string, value: string) => void;
    onSupportTargetsChange: (id: string, targets: string[]) => void;
}) => {
    const {
        attributes,
        listeners,
        setNodeRef,
        transform,
        transition,
        isDragging
    } = useSortable({ id: member.id });

    const style = {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.5 : 1,
    };

    const isSupporter = member.role === 'Supporter';

    return (
        <Grid size={{ xs: 12 }} ref={setNodeRef} style={style} {...attributes}>
            <Card variant="outlined" sx={{ position: 'relative' }}>
                <CardContent sx={{ p: '8px 12px !important', pr: '50px !important' }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        {/* Drag Handle */}
                        <IconButton
                            size="small"
                            sx={{ cursor: 'grab', p: 0.5 }}
                            {...listeners}
                        >
                            <DragIndicatorIcon fontSize="small" color="action" />
                        </IconButton>

                        <Typography variant="caption" sx={{ color: 'text.secondary', width: 20 }}>
                            {index + 1}
                        </Typography>

                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flex: 1 }}>
                            <Box sx={{ minWidth: 120 }}>
                                <Typography
                                    variant="body2"
                                    fontWeight="bold"
                                    sx={{
                                        color: (() => {
                                            switch (member.role) {
                                                case 'Supporter': return '#2e7d32';
                                                case 'Attacker': return '#d32f2f';
                                                case 'Defender': return '#1565c0';
                                                case 'Transcendence': return '#000000';
                                                default: return 'text.primary';
                                            }
                                        })()
                                    }}
                                >
                                    {member.name}
                                </Typography>
                                <Typography variant="caption" color="text.secondary">
                                    {member.role === 'Supporter' ? '支援型' : 'その他'}
                                </Typography>
                            </Box>

                            {/* Support Target Selector */}
                            {isSupporter && (
                                <FormControl size="small" sx={{ width: 200 }}>
                                    <InputLabel>支援対象</InputLabel>
                                    <Select
                                        multiple
                                        value={member.supportTargets || []}
                                        onChange={(e) => {
                                            const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                                            onSupportTargetsChange(member.id, value as string[]);
                                        }}
                                        input={<OutlinedInput label="支援対象" />}
                                        renderValue={(selected) => (
                                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                                                {selected.map((value) => {
                                                    const target = party.find(p => p.id === value);
                                                    return (
                                                        <Chip
                                                            key={value}
                                                            label={target ? target.name : 'Unknown'}
                                                            size="small"
                                                            sx={{ height: 20, fontSize: '0.7rem' }}
                                                        />
                                                    );
                                                })}
                                            </Box>
                                        )}
                                        onPointerDown={(e) => e.stopPropagation()} // Prevent drag start
                                        onKeyDown={(e) => e.stopPropagation()}
                                    >
                                        {party
                                            .filter(p => p.id !== member.id) // Exclude self
                                            .map((p, idx) => (
                                                <MenuItem key={p.id} value={p.id}>
                                                    {`${idx + 1}. ${p.name}`}
                                                </MenuItem>
                                            ))
                                        }
                                    </Select>
                                </FormControl>
                            )}

                            <TextField
                                label="死亡(R)"
                                type="number"
                                size="small"
                                variant="standard"
                                placeholder="-"
                                value={member.deathRound || ''}
                                onChange={(e) => onDeathChange(member.id, e.target.value)}
                                sx={{ width: 60, ml: 'auto' }}
                                slotProps={{ htmlInput: { min: 1, max: maxRounds } }}
                                onPointerDown={(e) => e.stopPropagation()}
                                onKeyDown={(e) => e.stopPropagation()}
                            />
                        </Box>
                    </Box>
                </CardContent>
                <IconButton
                    size="small"
                    onClick={() => onRemove(member.id)}
                    sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Card>
        </Grid>
    );
};

export const TurnSimulationPage: React.FC<TurnSimulationPageProps> = ({ characters }) => {
    // State now uses specific PartyMember type
    const [party, setParty] = useState<PartyMember[]>([]);
    const [maxRounds, setMaxRounds] = useState(5);
    const [simulationResults, setSimulationResults] = useState<Action[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleAddCharacter = (index: number) => {
        if (party.length < 9) {
            const newMember: PartyMember = {
                ...characters[index],
                id: `${characters[index].name}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
                deathRound: '',
                supportTargets: []
            };
            setParty([...party, newMember]);
        }
    };

    const handleRemoveCharacter = (id: string) => {
        setParty(party.filter((p) => p.id !== id));
    };

    const handleClearParty = () => {
        setParty([]);
        setSimulationResults(null);
        setError(null);
    };

    const handleDeathRoundChange = (id: string, value: string) => {
        setParty(prevParty => prevParty.map(p => p.id === id ? { ...p, deathRound: value } : p));
    };

    const handleSupportTargetsChange = (id: string, targets: string[]) => {
        setParty(prevParty => prevParty.map(p => p.id === id ? { ...p, supportTargets: targets } : p));
    };

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            setParty((items) => {
                const oldIndex = items.findIndex((item) => item.id === active.id);
                const newIndex = items.findIndex((item) => item.id === over.id);
                return arrayMove(items, oldIndex, newIndex);
            });
        }
    };

    const handleStartSimulation = () => {
        try {
            setError(null);

            // Map party member state to SimulationCharacter
            const simulationParty = party.map(p => {
                // Convert ID-based targets to Indices
                const supportTargetIndices = p.supportTargets
                    ?.map(targetId => party.findIndex(member => member.id === targetId))
                    .filter(idx => idx !== -1); // Filter out invalid indices

                return {
                    ...p,
                    deathRound: p.deathRound ? parseInt(p.deathRound) : undefined,
                    supportTargetIndices
                };
            });

            const results = simulateTurns(simulationParty, maxRounds);
            setSimulationResults(results);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error occurred');
            setSimulationResults(null);
        }
    };

    return (
        <Box sx={{ p: 2, height: 'auto', minHeight: 'calc(100vh - 80px)', display: 'flex', flexDirection: 'column' }}>
            <Typography variant="h5" gutterBottom fontWeight={700}>
                ターンシミュレーター
            </Typography>
            <Typography variant="body2" color="text.secondary" paragraph sx={{ mb: 2 }}>
                左側のリストから「＋」ボタンでキャラを追加できます。(最大9人)
            </Typography>

            <Grid container spacing={2} sx={{ flex: 1 }}>
                {/* Left Column: Character List */}
                <Grid size={{ xs: 12, md: 4 }}>
                    <CharacterList
                        characters={characters}
                        onAdd={handleAddCharacter}
                        onSelect={handleAddCharacter}
                    />
                </Grid>

                {/* Right Column: Config & Results */}
                <Grid size={{ xs: 12, md: 8 }} sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                    {/* Party Config */}
                    <Paper sx={{ p: 2, minHeight: '200px', display: 'flex', flexDirection: 'column' }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                                <Typography variant="subtitle1" fontWeight={600}>
                                    パーティー {party.length}/9
                                </Typography>
                                <TextField
                                    label="ラウンド数"
                                    type="number"
                                    size="small"
                                    value={maxRounds}
                                    onChange={(e) => setMaxRounds(Math.max(1, parseInt(e.target.value) || 1))}
                                    sx={{ width: 100 }}
                                    slotProps={{ htmlInput: { min: 1, max: 20 } }}
                                />
                                <Button
                                    variant="contained"
                                    startIcon={<PlayArrowIcon />}
                                    onClick={handleStartSimulation}
                                    disabled={party.length === 0}
                                >
                                    シミュレーション開始
                                </Button>
                            </Box>
                            <Button
                                size="small"
                                color="error"
                                onClick={handleClearParty}
                                disabled={party.length === 0}
                            >
                                一括解除
                            </Button>
                        </Box>

                        {party.length === 0 ? (
                            <Typography variant="caption" color="text.secondary" sx={{ py: 2, textAlign: 'center' }}>
                                リストからキャラを追加してください
                            </Typography>
                        ) : (
                            <DndContext
                                sensors={sensors}
                                collisionDetection={closestCenter}
                                onDragEnd={handleDragEnd}
                            >
                                <SortableContext
                                    items={party.map(p => p.id)}
                                    strategy={verticalListSortingStrategy}
                                >
                                    <Grid container spacing={1}>
                                        {party.map((member, index) => (
                                            <SortableItem
                                                key={member.id}
                                                member={member}
                                                index={index}
                                                maxRounds={maxRounds}
                                                party={party}
                                                onRemove={handleRemoveCharacter}
                                                onDeathChange={handleDeathRoundChange}
                                                onSupportTargetsChange={handleSupportTargetsChange}
                                            />
                                        ))}
                                    </Grid>
                                </SortableContext>
                            </DndContext>
                        )}
                    </Paper>

                    {/* Results */}
                    <Box sx={{ flex: 1, overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {error && (
                            <Paper sx={{ p: 2, bgcolor: '#ffebee', color: '#c62828', mb: 2 }}>
                                <Typography variant="body2">{error}</Typography>
                            </Paper>
                        )}

                        {simulationResults ? (
                            <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto' }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Round</TableCell>
                                            <TableCell>Total Turn</TableCell>
                                            <TableCell>Actor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {simulationResults.map((action, idx) => (
                                            <TableRow key={idx} hover sx={{ bgcolor: action.actorName === 'Boss' ? '#fff3e0' : 'inherit' }}>
                                                <TableCell>{action.round}</TableCell>
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
                                                                            default: return '#757575';
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
                                        ))}
                                    </TableBody>
                                </Table>
                            </TableContainer>
                        ) : (
                            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography color="text.secondary" variant="body2">
                                    シミュレーション開始ボタンを押すと結果が表示されます
                                </Typography>
                            </Paper>
                        )}
                    </Box>

                    {/* Skill Detail View */}
                    {simulationResults && (
                        <Paper sx={{ p: 2, height: '900px', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                            <Typography variant="subtitle1" gutterBottom fontWeight={600}>
                                受けたスキル履歴
                            </Typography>
                            <Box sx={{ mb: 2, display: 'flex', gap: 1, overflowX: 'auto', pb: 1 }}>
                                {party.map((p) => (
                                    <Chip
                                        key={p.id}
                                        label={p.name}
                                        onClick={() => setSelectedCharacterId(p.id)}
                                        color={selectedCharacterId === p.id ? 'primary' : 'default'}
                                        variant={selectedCharacterId === p.id ? 'filled' : 'outlined'}
                                        clickable
                                    />
                                ))}
                            </Box>

                            {selectedCharacterId ? (
                                <TableContainer sx={{ flex: 1, overflow: 'auto' }}>
                                    <Table stickyHeader size="small">
                                        <TableHead>
                                            <TableRow>
                                                <TableCell>Round</TableCell>
                                                <TableCell>Turn</TableCell>
                                                <TableCell>Context Actor</TableCell>
                                                <TableCell>受けたスキル</TableCell>
                                                <TableCell>効果</TableCell>
                                            </TableRow>
                                        </TableHead>
                                        <TableBody>
                                            {(() => {
                                                const charIndex = party.findIndex(p => p.id === selectedCharacterId);
                                                if (charIndex === -1) return null;

                                                return simulationResults.map((action, idx) => {
                                                    const state = action.characterStates[charIndex];
                                                    const skills = state ? state.receivedSkills : [];

                                                    // Only show rows where state changes? Or all? User said "per turn".
                                                    // Let's show all for clarity so they can see the timeline.

                                                    return (
                                                        <TableRow key={idx} hover>
                                                            <TableCell>{action.round}</TableCell>
                                                            <TableCell>{action.globalTurn}</TableCell>
                                                            <TableCell sx={{ color: 'text.secondary', fontSize: '0.8rem' }}>
                                                                {action.actorName} の行動時
                                                            </TableCell>
                                                            <TableCell>
                                                                <Stack spacing={0.5}>
                                                                    {skills.length > 0 ? skills.map((skill, sIdx) => (
                                                                        <Chip
                                                                            key={sIdx}
                                                                            label={skill.name}
                                                                            size="small"
                                                                            sx={{ fontSize: '0.7rem', height: '24px' }}
                                                                        />
                                                                    )) : (
                                                                        <Typography variant="caption" color="text.secondary">-</Typography>
                                                                    )}
                                                                </Stack>
                                                            </TableCell>
                                                            <TableCell>
                                                                <Stack spacing={0.5}>
                                                                    {skills.length > 0 ? skills.map((skill, sIdx) => {
                                                                        const effectsText = skill.effects.map(e => {
                                                                            const sign = e.type === 'Buff' ? '+' : '-';

                                                                            // Translation Map
                                                                            const attrMap: Record<string, string> = {
                                                                                'Attack': '攻撃力',
                                                                                'Support': '支援力',
                                                                                'Armor': '防御力',
                                                                                'Hp': 'HP',
                                                                                'CritRate': 'クリティカル率',
                                                                                'CritDamage': 'クリティカルダメージ',
                                                                                'DamageReduction': 'ダメージ軽減',
                                                                                'Evasion': 'ダメージ回避',
                                                                                'HyperCritDamage': 'ハイパークリティカルダメージ',
                                                                                'Mobility': '機動力'
                                                                            };

                                                                            const translatedAttr = attrMap[e.attribute] || e.attribute;
                                                                            return `${translatedAttr} ${sign}${e.value}%`;
                                                                        }).join(', ');

                                                                        return (
                                                                            <Chip
                                                                                key={sIdx}
                                                                                label={effectsText || "効果なし"}
                                                                                variant="outlined"
                                                                                size="small"
                                                                                sx={{ fontSize: '0.7rem', height: '24px', justifyContent: 'flex-start', border: 'none' }}
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
                                <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 1 }}>
                                    <Typography color="text.secondary" variant="body2">
                                        履歴を確認したいキャラを選択してください
                                    </Typography>
                                </Box>
                            )}
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};
