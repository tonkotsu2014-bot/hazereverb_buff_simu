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
    Chip
} from '@mui/material';
import DeleteIcon from '@mui/icons-material/Delete';
import PlayArrowIcon from '@mui/icons-material/PlayArrow';
import DragIndicatorIcon from '@mui/icons-material/DragIndicator';
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
import type { ParsedCharacterData } from '../../../logic/wikiParser';
import { CharacterSettingsDialog } from '../CharacterSettingsDialog';

// Extended type for party members to include UI status
export interface PartyMember extends ParsedCharacterData {
    id: string; // Unique ID for DnD key
    deathRound?: string;
    supportTargets?: string[]; // IDs of target characters
    exSkillRounds?: string; // Comma separated rounds
    activeSkillLevel?: string; // Selected level for all skills (e.g. '5')
}

// Sortable Item Component (Internal)
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
                                // e.stopPropagation(); 
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
                                                case 'Attacker': return '#d32f2f';
                                                case 'Supporter': return '#2e7d32';
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

interface PartyConfigurationPanelProps {
    party: PartyMember[];
    onPartyChange: (newParty: PartyMember[]) => void;
    maxRounds: number;
    onMaxRoundsChange: (rounds: number) => void;
    onStartSimulation: () => void;
    onClearParty: () => void;
    onRemoveMember: (id: string) => void;
}

export const PartyConfigurationPanel: React.FC<PartyConfigurationPanelProps> = ({
    party,
    onPartyChange,
    maxRounds,
    onMaxRoundsChange,
    onStartSimulation,
    onClearParty,
    onRemoveMember,
}) => {
    // Config Dialog State (Internalized)
    const [configMemberId, setConfigMemberId] = useState<string | null>(null);
    const configMember = party.find(p => p.id === configMemberId) || null;

    // DnD Sensors
    const sensors = useSensors(
        useSensor(PointerSensor),
        useSensor(KeyboardSensor, {
            coordinateGetter: sortableKeyboardCoordinates,
        })
    );

    const handleDragEnd = (event: DragEndEvent) => {
        const { active, over } = event;
        if (over && active.id !== over.id) {
            const oldIndex = party.findIndex((item) => item.id === active.id);
            const newIndex = party.findIndex((item) => item.id === over.id);
            const newParty = arrayMove(party, oldIndex, newIndex);
            onPartyChange(newParty);
        }
    };

    const handleUpdateMember = (id: string, updates: Partial<PartyMember>) => {
        const newParty = party.map(p => p.id === id ? { ...p, ...updates } : p);
        onPartyChange(newParty);
    };

    return (
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
                        onChange={(e) => onMaxRoundsChange(Math.max(1, parseInt(e.target.value) || 1))}
                        sx={{ width: 100 }}
                        slotProps={{ htmlInput: { min: 1, max: 20 } }}
                    />
                    <Button
                        variant="contained"
                        startIcon={<PlayArrowIcon />}
                        onClick={onStartSimulation}
                        disabled={party.length === 0}
                    >
                        シミュレーション開始
                    </Button>
                </Box>
                <Button
                    size="small"
                    color="error"
                    onClick={onClearParty}
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
                                    onRemove={onRemoveMember}
                                    onEdit={setConfigMemberId}
                                />
                            ))}
                        </Grid>
                    </SortableContext>
                </DndContext>
            )}

            {/* Character Config Dialog (Internalized) */}
            <CharacterSettingsDialog
                open={!!configMemberId}
                onClose={() => setConfigMemberId(null)}
                member={configMember}
                party={party}
                maxRounds={maxRounds}
                onUpdate={handleUpdateMember}
            />
        </Paper>
    );
};
