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
    Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';

interface Props {
    characters: ParsedCharacterData[];
    onDelete?: (index: number) => void;
    onSelect?: (index: number) => void;
    onAdd?: (index: number) => void;
    selectedIndex?: number | null;
}

export const CharacterList: React.FC<Props> = ({ characters, onDelete, onSelect, onAdd, selectedIndex }) => {
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
                    /*
                    <Stack direction="row" spacing={1}>
                        // Buttons removed
                    </Stack>
                    */
                    null
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
                                <ListItemIcon sx={{ minWidth: 36, color: currentSelected === index ? 'primary.main' : 'text.secondary' }}>
                                    <PersonIcon />
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
                                            color={char.type.includes('攻撃') ? 'error' : char.type.includes('支援') ? 'info' : 'default'}
                                            variant="outlined"
                                            sx={{ mt: 0.5, height: 20, fontSize: '0.7rem' }}
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
