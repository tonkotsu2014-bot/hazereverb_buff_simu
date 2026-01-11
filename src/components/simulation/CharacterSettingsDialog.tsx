import React from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    DialogActions,
    Button,
    FormControl,
    InputLabel,
    Select,
    MenuItem,
    TextField,
    Box,
    OutlinedInput,
    Chip,
    Stack,
    Typography
} from '@mui/material';
import type { ParsedCharacterData } from '../../logic/wikiParser';

// Duplicate definition to avoid circular dependency or import issues if not exported
// Ideally should be shared, but for now defining compatible interface
interface PartyMember extends ParsedCharacterData {
    id: string;
    deathRound?: string;
    supportTargets?: string[];
    exSkillRounds?: string;
    activeSkillLevel?: string;
}

interface CharacterSettingsDialogProps {
    open: boolean;
    onClose: () => void;
    member: PartyMember | null;
    party: PartyMember[];
    maxRounds: number;
    onUpdate: (id: string, updates: Partial<PartyMember>) => void;
}

export const CharacterSettingsDialog: React.FC<CharacterSettingsDialogProps> = ({
    open,
    onClose,
    member,
    party,
    maxRounds,
    onUpdate
}) => {
    if (!member) return null;

    const isSupporter = member.role === 'Supporter';

    const handleSkillLevelChange = (level: string) => {
        onUpdate(member.id, { activeSkillLevel: level });
    };

    const handleDeathRoundChange = (value: string) => {
        onUpdate(member.id, { deathRound: value });
    };

    const handleExRoundsChange = (value: string) => {
        onUpdate(member.id, { exSkillRounds: value });
    };

    const handleSupportTargetsChange = (targets: string[]) => {
        onUpdate(member.id, { supportTargets: targets });
    };

    return (
        <Dialog open={open} onClose={onClose} maxWidth="xs" fullWidth>
            <DialogTitle>
                {member.name}
                <Typography variant="caption" display="block" color="text.secondary">
                    {member.role === 'Supporter' ? '支援型' : 'その他'}
                </Typography>
            </DialogTitle>
            <DialogContent dividers>
                <Stack spacing={3} sx={{ mt: 1 }}>
                    {/* Skill Level Selector */}
                    <FormControl size="small" fullWidth>
                        <InputLabel>スキルレベル</InputLabel>
                        <Select
                            value={member.activeSkillLevel || '10'}
                            label="スキルレベル"
                            onChange={(e) => handleSkillLevelChange(e.target.value)}
                        >
                            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((level) => (
                                <MenuItem key={level} value={String(level)}>
                                    Lv.{level}
                                </MenuItem>
                            ))}
                        </Select>
                    </FormControl>

                    {/* Support Target Selector */}
                    {isSupporter && (
                        <FormControl size="small" fullWidth>
                            <InputLabel>支援対象</InputLabel>
                            <Select
                                multiple
                                value={member.supportTargets || []}
                                onChange={(e) => {
                                    const value = typeof e.target.value === 'string' ? e.target.value.split(',') : e.target.value;
                                    handleSupportTargetsChange(value as string[]);
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

                    <Box sx={{ display: 'flex', gap: 2 }}>
                        {/* Death Round */}
                        <TextField
                            label="死亡ラウンド"
                            type="number"
                            size="small"
                            fullWidth
                            placeholder="-"
                            value={member.deathRound || ''}
                            onChange={(e) => handleDeathRoundChange(e.target.value)}
                            slotProps={{ htmlInput: { min: 1, max: maxRounds } }}
                            helperText="指定ラウンド開始時に死亡扱い"
                        />

                        {/* EX Skill Rounds */}
                        <TextField
                            label="Ex発動ラウンド"
                            size="small"
                            fullWidth
                            placeholder="1,3"
                            value={member.exSkillRounds || ''}
                            onChange={(e) => handleExRoundsChange(e.target.value)}
                            helperText="カンマ区切り (例: 1,3)"
                        />
                    </Box>
                </Stack>
            </DialogContent>
            <DialogActions>
                <Button onClick={onClose} color="primary">
                    閉じる
                </Button>
            </DialogActions>
        </Dialog>
    );
};
