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
    Paper,
    ListItemIcon,
    Box,
    IconButton,
    Chip
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';

interface Props {
    characters: ParsedCharacterData[];
    onDelete?: (index: number) => void;
}

export const CharacterList: React.FC<Props> = ({ characters, onDelete }) => {
    const [selectedCharacter, setSelectedCharacter] = useState<ParsedCharacterData | null>(null);

    return (
        <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', border: 'none' }}>
            <CardHeader
                title={
                    <Typography variant="h6" fontWeight={700} color="text.primary">
                        Character List
                    </Typography>
                }
                subheader={`${characters.length} characters loaded`}
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
                        <Typography variant="body1" fontWeight={500}>No characters yet</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            Add characters from the parser panel.
                        </Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {characters.map((char, index) => (
                            <ListItemButton
                                key={index}
                                selected={selectedCharacter === char}
                                onClick={() => setSelectedCharacter(char)}
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
                                <ListItemIcon sx={{ minWidth: 36, color: selectedCharacter === char ? 'primary.main' : 'text.secondary' }}>
                                    <PersonIcon />
                                </ListItemIcon>
                                <Box sx={{ flex: 1 }}>
                                    <ListItemText
                                        primary={char.name || 'Unknown Character'}
                                        primaryTypographyProps={{
                                            fontWeight: selectedCharacter === char ? 600 : 400,
                                            color: selectedCharacter === char ? 'primary.main' : 'text.primary'
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
                                {onDelete && (
                                    <IconButton
                                        edge="end"
                                        aria-label="delete"
                                        size="small"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            onDelete(index);
                                            if (selectedCharacter === char) setSelectedCharacter(null); // Clear selection if deleted
                                        }}
                                        sx={{
                                            opacity: 0.5,
                                            '&:hover': { opacity: 1, color: 'error.main' }
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

            {selectedCharacter && (
                <Paper
                    elevation={0}
                    square
                    sx={{
                        p: 0,
                        borderTop: '1px solid',
                        borderColor: 'divider',
                        height: '45%',
                        minHeight: 200,
                        display: 'flex',
                        flexDirection: 'column'
                    }}
                >
                    <Box sx={{ p: 2, bgcolor: 'background.default', borderBottom: '1px solid', borderColor: 'divider' }}>
                        <Typography variant="subtitle2" fontWeight="bold" color="primary">
                            DETAILS: {selectedCharacter.name}
                        </Typography>
                    </Box>
                    <Box sx={{ flex: 1, overflow: 'auto', p: 2, bgcolor: '#f8fafc' }}>
                        <pre style={{
                            margin: 0,
                            fontSize: '0.75rem',
                            fontFamily: 'Consolas, monospace',
                            whiteSpace: 'pre-wrap',
                            wordBreak: 'break-all',
                            color: '#334155'
                        }}>
                            {JSON.stringify(selectedCharacter, null, 2)}
                        </pre>
                    </Box>
                </Paper>
            )}
        </Card>
    );
};
