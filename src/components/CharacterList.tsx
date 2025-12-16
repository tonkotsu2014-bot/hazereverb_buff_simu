import React, { useState } from 'react';
import type { ParsedCharacterData } from '../logic/wikiParser';
import {
    Card,
    CardHeader,
    CardContent,
    List,
    ListItemButton,
    ListItemText,
    Typography,
    ListItemIcon,
    Box,
    IconButton,
    Chip,
    Button
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AddIcon from '@mui/icons-material/Add';

interface Props {
    characters: ParsedCharacterData[];
    onDelete?: (index: number) => void;
    onSelect?: (index: number) => void;
    onAdd?: (index: number) => void;
    onCreateNew?: () => void;
    selectedIndex?: number | null;
}

export const CharacterList: React.FC<Props> = ({ characters, onDelete, onSelect, onAdd, onCreateNew, selectedIndex }) => {
    // We lift the state up if onSelect is provided, otherwise local state (though mostly unused currently without onSelect in parent)
    const [localSelected, setLocalSelected] = useState<number | null>(null);

    const handleSelect = (index: number) => {
        if (onSelect) {
            onSelect(index);
        } else {
            setLocalSelected(index);
        }
    };

    const currentSelected = onSelect ? selectedIndex : localSelected;

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: 'none', boxShadow: 0 }}>
            <CardHeader
                title={
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                        キャラ一覧
                    </Typography>
                }
                subheader={`${characters.length} 名`}
                action={
                    onCreateNew ? (
                        <Button
                            variant="contained"
                            size="small"
                            startIcon={<AddIcon />}
                            onClick={onCreateNew}
                        >
                            キャラ追加
                        </Button>
                    ) : null
                }
                sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    py: 2,
                    px: 3
                }}
            />
            <CardContent sx={{ flex: 1, overflow: 'auto', p: 0 }}>
                {characters.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.7 }}>
                        <Typography variant="body1" fontWeight={500}>キャラクターがいません</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            キャラを追加してください。
                        </Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {characters.map((char, index) => (
                            <ListItemButton
                                key={index}
                                selected={currentSelected === index}
                                onClick={() => handleSelect(index)}
                                sx={{
                                    py: 1.5,
                                    px: 3,
                                    borderBottom: '1px solid',
                                    borderColor: 'divider',
                                    '&.Mui-selected': {
                                        bgcolor: 'primary.alpha',
                                        borderLeft: '4px solid',
                                        borderLeftColor: 'primary.main',
                                        pl: '20px'
                                    },
                                    '&:hover': {
                                        bgcolor: 'action.hover'
                                    }
                                }}
                            >
                                <ListItemIcon sx={{ minWidth: 36 }}>
                                    <PersonIcon sx={{
                                        color: (() => {
                                            const role = char.role || (char.type?.includes('支援') ? 'Supporter' : char.type?.includes('攻撃') ? 'Attacker' : char.type?.includes('防御') ? 'Defender' : char.type?.includes('超越') ? 'Transcendence' : 'Unknown');
                                            switch (role) {
                                                case 'Supporter': return '#2e7d32';
                                                case 'Attacker': return '#d32f2f';
                                                case 'Defender': return '#1565c0';
                                                case 'Transcendence': return '#000000';
                                                default: return 'action.active';
                                            }
                                        })()
                                    }} />
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                    <ListItemText
                                        primary={char.name || '名称不明'}
                                        primaryTypographyProps={{
                                            fontWeight: currentSelected === index ? 600 : 400,
                                            color: currentSelected === index ? 'primary.main' : 'text.primary'
                                        }}
                                    />
                                    {char.type && (
                                        <Chip
                                            label={char.type}
                                            size="small"
                                            variant="outlined"
                                            sx={{
                                                mt: 0.5,
                                                height: 20,
                                                fontSize: '0.7rem',
                                                color: (() => {
                                                    const role = char.role || (char.type?.includes('支援') ? 'Supporter' : char.type?.includes('攻撃') ? 'Attacker' : char.type?.includes('防御') ? 'Defender' : char.type?.includes('超越') ? 'Transcendence' : 'Unknown');
                                                    switch (role) {
                                                        case 'Supporter': return '#2e7d32';
                                                        case 'Attacker': return '#d32f2f';
                                                        case 'Defender': return '#1565c0';
                                                        case 'Transcendence': return '#000000';
                                                        default: return 'text.secondary';
                                                    }
                                                })(),
                                                borderColor: (() => {
                                                    const role = char.role || (char.type?.includes('支援') ? 'Supporter' : char.type?.includes('攻撃') ? 'Attacker' : char.type?.includes('防御') ? 'Defender' : char.type?.includes('超越') ? 'Transcendence' : 'Unknown');
                                                    switch (role) {
                                                        case 'Supporter': return 'rgba(46, 125, 50, 0.5)';
                                                        case 'Attacker': return 'rgba(211, 47, 47, 0.5)';
                                                        case 'Defender': return 'rgba(21, 101, 192, 0.5)';
                                                        case 'Transcendence': return 'rgba(0, 0, 0, 0.5)';
                                                        default: return 'divider';
                                                    }
                                                })()
                                            }}
                                        />
                                    )}
                                </Box>
                                {onAdd && (
                                    <IconButton
                                        edge="end"
                                        aria-label="add"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onAdd(index);
                                        }}
                                        sx={{
                                            color: 'primary.main',
                                            '&:hover': { bgcolor: 'primary.alpha', opacity: 0.8 }
                                        }}
                                    >
                                        <AddCircleOutlineIcon />
                                    </IconButton>
                                )}
                                {onDelete && (
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(index);
                                            if (currentSelected === index) handleSelect(-1); // Deselect if deleted
                                        }}
                                        sx={{
                                            opacity: 0.5,
                                            '&:hover': { opacity: 1, color: 'error.main' },
                                            ml: 1
                                        }}
                                    >
                                        <DeleteIcon />
                                    </IconButton>
                                )}
                            </ListItemButton>
                        ))}
                    </List>
                )}
            </CardContent>
            {/* Replaced Preview with Detail Form in parent, so removing preview pane here */}
        </Card>
    );
};
