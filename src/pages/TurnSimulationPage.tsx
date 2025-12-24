
import React, { useState, useEffect } from 'react';
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
    Chip,
    Stack,
    Dialog,
    DialogTitle,
    DialogContent,
    List,
    ListItem,
    Tabs,
    Tab,
    // ListItemText, // Removed
    // Divider // Removed
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
import { CharacterList } from '../components/CharacterList';
import type { ParsedCharacterData } from '../logic/wikiParser';
import { simulateTurns, type Action, type ReceivedSkill } from '../logic/turnSimulator';
import { SimulationResultGraph } from '../components/Simulation/SimulationResultGraph';
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
import { CharacterSettingsDialog } from '../components/Simulation/CharacterSettingsDialog';

interface TurnSimulationPageProps {
    characters: ParsedCharacterData[];
}

// Extended type for party members to include UI status
interface PartyMember extends ParsedCharacterData {
    id: string; // Unique ID for DnD key
    deathRound?: string;
    supportTargets?: string[]; // IDs of target characters
    exSkillRounds?: string; // Comma separated rounds
    activeSkillLevel?: string; // Selected level for all skills (e.g. '5')
}

const ATTRIBUTE_TRANSLATION: Record<string, string> = {
    'Attack': '攻撃力',
    'Support': '支援力',
    'Armor': '防御力',
    'Hp': 'HP',
    'CritRate': 'クリティカル率',
    'CritDamage': 'クリティカルダメージ',
    'DamageReduction': 'ダメージ軽減',
    'Evasion': 'ダメージ回避',
    'HyperCritDamage': 'ハイパークリティカルダメージ',
    'Mobility': '機動力',
    'Silent': '静寂 (サイレント)'
};

// Sortable Item Component
interface SortableItemProps {
    member: PartyMember;
    index: number;
    maxRounds: number;
    party: PartyMember[];
    onRemove: (id: string) => void;
    onEdit: (id: string) => void;
}

const SortableItem: React.FC<SortableItemProps> = ({ member, index, party, onRemove, onEdit }) => {
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
                <CardContent
                    sx={{
                        p: '8px 12px !important',
                        pr: '50px !important',
                        cursor: 'pointer',
                        '&:hover': { bgcolor: 'action.hover' }
                    }}
                    onClick={() => onEdit(member.id)}
                >
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexWrap: 'wrap' }}>
                        {/* Drag Handle */}
                        <IconButton
                            size="small"
                            sx={{ cursor: 'grab', p: 0.5 }}
                            onPointerDown={() => {
                                // e.stopPropagation(); // Standard sortable needs propagation for drag, but we don't want click.
                                // listeners handle drag. We just need to ensure card click doesn't fire when dragging.
                                // Actually listeners are attached to this button only defined below.
                            }}
                            onClick={(e) => e.stopPropagation()} // Prevent card click
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

                            {/* Settings Summary */}
                            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1, alignItems: 'center' }}>
                                {/* Active Level */}
                                <Chip
                                    label={`Lv.${member.activeSkillLevel || '10'}`}
                                    size="small"
                                    variant="outlined"
                                    sx={{ height: 20, fontSize: '0.7rem' }}
                                />

                                {/* Death Round */}
                                {member.deathRound && (
                                    <Chip
                                        label={`💀 ${member.deathRound}R`}
                                        size="small"
                                        color="error"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                )}

                                {/* Ex Rounds */}
                                {member.exSkillRounds && (
                                    <Chip
                                        label={`Ex: ${member.exSkillRounds}`}
                                        size="small"
                                        color="primary"
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem' }}
                                    />
                                )}

                                {/* Support Targets */}
                                {isSupporter && (
                                    <Chip
                                        label={(() => {
                                            if (!member.supportTargets || member.supportTargets.length === 0) {
                                                return 'Target: 未設定';
                                            }
                                            // Map IDs to Names
                                            const names = member.supportTargets.map(id => {
                                                const target = party.find(p => p.id === id);
                                                return target ? target.name : 'Unknown';
                                            });
                                            return `Target: ${names.join(', ')}`;
                                        })()}
                                        size="small"
                                        color={(!member.supportTargets || member.supportTargets.length === 0) ? 'default' : 'success'}
                                        variant="outlined"
                                        sx={{ height: 20, fontSize: '0.7rem', maxWidth: 200 }}
                                    />
                                )}
                            </Box>
                        </Box>
                    </Box>
                </CardContent>
                <IconButton
                    size="small"
                    onClick={(e) => {
                        e.stopPropagation();
                        onRemove(member.id);
                    }}
                    sx={{ position: 'absolute', right: 4, top: '50%', transform: 'translateY(-50%)' }}
                >
                    <DeleteIcon fontSize="small" />
                </IconButton>
            </Card>
        </Grid >
    );
};

export const TurnSimulationPage: React.FC<TurnSimulationPageProps> = ({ characters }) => {
    // State now uses specific PartyMember type
    const [party, setParty] = useState<PartyMember[]>(() => {
        try {
            const saved = localStorage.getItem('hazreverb_turn_sim_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.party && Array.isArray(parsed.party)) {
                    return parsed.party;
                }
            }
        } catch (e) {
            console.error('Failed to load turn sim state', e);
        }
        return [];
    });

    const [maxRounds, setMaxRounds] = useState(() => {
        try {
            const saved = localStorage.getItem('hazreverb_turn_sim_state');
            if (saved) {
                const parsed = JSON.parse(saved);
                if (parsed.maxRounds) {
                    return parsed.maxRounds;
                }
            }
        } catch (e) {
            console.error('Failed to load turn sim state', e);
        }
        return 5;
    });

    // Save state to localStorage
    useEffect(() => {
        const state = { party, maxRounds };
        localStorage.setItem('hazreverb_turn_sim_state', JSON.stringify(state));
    }, [party, maxRounds]);

    // Sync party with updated characters data
    useEffect(() => {
        setParty(prevParty => {
            let hasChanges = false;
            const nextParty = prevParty.map(member => {
                const freshChar = characters.find(c => c.name === member.name);
                if (freshChar) {
                    // Check if stats/skills changed
                    if (JSON.stringify(member.stats) !== JSON.stringify(freshChar.stats) ||
                        JSON.stringify(member.skills) !== JSON.stringify(freshChar.skills)) {

                        hasChanges = true;
                        return {
                            ...freshChar,
                            id: member.id,
                            deathRound: member.deathRound,
                            supportTargets: member.supportTargets,
                            exSkillRounds: member.exSkillRounds,
                            activeSkillLevel: member.activeSkillLevel
                        };
                    }
                }
                return member;
            });
            return hasChanges ? nextParty : prevParty;
        });
    }, [characters]);

    const [simulationResults, setSimulationResults] = useState<Action[] | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [selectedCharacterId, setSelectedCharacterId] = useState<string | null>(null);

    // Config Dialog State
    const [configMemberId, setConfigMemberId] = useState<string | null>(null);
    const configMember = party.find(p => p.id === configMemberId) || null;

    // Popup state
    const [dialogOpen, setDialogOpen] = useState(false);
    const [selectedSkills, setSelectedSkills] = useState<ReceivedSkill[]>([]);
    const [selectedTurnInfo, setSelectedTurnInfo] = useState<{ round: number; turn: number } | null>(null);
    const [tabValue, setTabValue] = useState(0);

    const handleTabChange = (_event: React.SyntheticEvent, newValue: number) => {
        setTabValue(newValue);
    };

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
                supportTargets: [],
                exSkillRounds: '',
                activeSkillLevel: '10' // Default to Max Level (10) as per request
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

    const handleUpdateMember = (id: string, updates: Partial<PartyMember>) => {
        setParty(prevParty => prevParty.map(p => p.id === id ? { ...p, ...updates } : p));
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

                const exSkillRounds = p.exSkillRounds
                    ? p.exSkillRounds.split(/[,\s]+/).map(r => parseInt(r)).filter(n => !isNaN(n))
                    : [];

                const simChar = {
                    ...p,
                    deathRound: p.deathRound ? parseInt(p.deathRound) : undefined,
                    supportTargetIndices,
                    exSkillRounds
                };

                // Apply active levels to skills
                if (p.activeSkillLevel) {
                    simChar.skills = simChar.skills.map(skill => {
                        // Check if this skill actually has the selected level? 
                        // Or just assume it does (simulator should handle fallback if exact level string missing, 
                        // though here we assume standard leveling)
                        return { ...skill, activeLevel: p.activeSkillLevel };
                    });
                }

                return simChar;
            });

            const results = simulateTurns(simulationParty, maxRounds);
            setSimulationResults(results);
        } catch (e) {
            setError(e instanceof Error ? e.message : 'Unknown error occurred');
            setSimulationResults(null);
        }
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
        // setSelectedTurnInfo(null); 
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
                                                onEdit={setConfigMemberId}
                                            />
                                        ))}
                                    </Grid>
                                </SortableContext>
                            </DndContext>
                        )}
                    </Paper>

                    {/* Results */}
                    <Box sx={{ overflow: 'hidden', display: 'flex', flexDirection: 'column' }}>
                        {error && (
                            <Paper sx={{ p: 2, bgcolor: '#ffebee', color: '#c62828', mb: 2 }}>
                                <Typography variant="body2">{error}</Typography>
                            </Paper>
                        )}

                        {simulationResults ? (
                            <TableContainer component={Paper} sx={{ flex: 1, overflow: 'auto', maxHeight: '400px' }}>
                                <Table stickyHeader size="small">
                                    <TableHead>
                                        <TableRow>
                                            <TableCell>Round</TableCell>
                                            <TableCell>Total Turn</TableCell>
                                            <TableCell>Actor</TableCell>
                                        </TableRow>
                                    </TableHead>
                                    <TableBody>
                                        {simulationResults.map((action, idx) => {
                                            const isRoundStart = idx === 0 || action.round !== simulationResults[idx - 1].round;
                                            let rowSpan = 0;
                                            if (isRoundStart) {
                                                rowSpan = 1;
                                                for (let i = idx + 1; i < simulationResults.length; i++) {
                                                    if (simulationResults[i].round === action.round) {
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
                        ) : (
                            <Paper sx={{ p: 3, textAlign: 'center', bgcolor: '#f5f5f5', flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                <Typography color="text.secondary" variant="body2">
                                    シミュレーション開始ボタンを押すと結果が表示されます
                                </Typography>
                            </Paper>
                        )}
                    </Box>

                    {/* Skill Detail View - Tabs Top, Content Bottom */}
                    {simulationResults && (
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

                                                        return simulationResults.map((action, idx) => {
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
                                        simulationResults={simulationResults}
                                        selectedCharacterId={selectedCharacterId}
                                        party={party.map(p => ({ ...p, name: p.name || 'Unknown' }))}
                                        selectedGlobalTurn={selectedTurnInfo?.turn}
                                    />
                                )}
                            </Box>
                        </Paper>
                    )}
                </Grid>
            </Grid>

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
            {/* Character Config Dialog */}
            <CharacterSettingsDialog
                open={!!configMemberId}
                onClose={() => setConfigMemberId(null)}
                member={configMember}
                party={party}
                maxRounds={maxRounds}
                onUpdate={handleUpdateMember}
            />

        </Box>
    );
};
