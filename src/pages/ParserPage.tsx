import { useState } from 'react';
import { Box, Paper, Typography, Grid, IconButton } from '@mui/material';
import { ParserOverlay } from '../components/WikiParser/ParserOverlay';
import type { ParsedCharacterData } from '../logic/wikiParser';
import { CharacterList } from '../components/CharacterList';
import CloseIcon from '@mui/icons-material/Close';

interface Props {
    characters: ParsedCharacterData[];
    onAddCharacter: (character: ParsedCharacterData) => void;
    onDelete: (index: number) => void;
}

export const ParserPage: React.FC<Props> = ({ characters, onAddCharacter, onDelete }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const selectedCharacter = selectedIndex !== null ? characters[selectedIndex] : null;

    return (
        <Box sx={{ p: 3, height: '100%', boxSizing: 'border-box' }}>
            <Grid container spacing={3} sx={{ height: '100%' }}>
                {/* Left side: Character List & JSON Preview */}
                <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%', display: 'flex', flexDirection: 'column', gap: 2 }}>
                    <Box sx={{ flex: selectedCharacter ? '0 0 50%' : '1 1 auto', minHeight: 0 }}>
                        <CharacterList
                            characters={characters}
                            selectedIndex={selectedIndex}
                            onSelect={setSelectedIndex}
                            onDelete={onDelete}
                        />
                    </Box>

                    {selectedCharacter && (
                        <Paper sx={{ flex: '1 1 auto', display: 'flex', flexDirection: 'column', p: 2, minHeight: 0, overflow: 'hidden' }}>
                            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                <Typography variant="subtitle1" fontWeight="bold">
                                    JSONデータ
                                </Typography>
                                <IconButton onClick={() => setSelectedIndex(null)} size="small">
                                    <CloseIcon />
                                </IconButton>
                            </Box>
                            <Box sx={{
                                flexGrow: 1,
                                overflow: 'auto',
                                bgcolor: 'grey.50',
                                p: 1.5,
                                borderRadius: 1,
                                fontFamily: 'monospace',
                                fontSize: '0.75rem',
                                whiteSpace: 'pre-wrap',
                                wordBreak: 'break-all',
                                border: '1px solid',
                                borderColor: 'divider'
                            }}>
                                {JSON.stringify(selectedCharacter, null, 2)}
                            </Box>
                        </Paper>
                    )}
                </Grid>

                {/* Right side: Import Area (Always Visible) */}
                <Grid size={{ xs: 12, md: 8 }} sx={{ height: '100%' }}>
                    <Paper sx={{ p: 3, height: '100%', display: 'flex', flexDirection: 'column' }}>
                        <Typography variant="h5" gutterBottom>
                            キャラ インポート
                        </Typography>
                        <Box sx={{ flexGrow: 1, minHeight: 0 }}>
                            <ParserOverlay onAddCharacter={onAddCharacter} />
                        </Box>
                    </Paper>
                </Grid>
            </Grid>
        </Box>
    );
};
