import React, { useState } from 'react';
import { Box, Grid, Typography, Paper } from '@mui/material';
import { CharacterList } from '../components/CharacterList';
import { CharacterDetailForm } from '../components/CharacterDetailForm';
import type { ParsedCharacterData } from '../logic/wikiParser';

interface Props {
    characters: ParsedCharacterData[];
    onDelete: (index: number) => void;
    onImport: (data: ParsedCharacterData[]) => void;
    onUpdate: (index: number, updated: ParsedCharacterData) => void;
}

export const CharacterEditPage: React.FC<Props> = ({ characters, onDelete, onImport, onUpdate }) => {
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

    const handleSelect = (index: number) => {
        setSelectedIndex(index);
    };

    const selectedCharacter = selectedIndex !== null ? characters[selectedIndex] : null;

    const handleCharacterUpdate = (updated: ParsedCharacterData) => {
        if (selectedIndex !== null) {
            onUpdate(selectedIndex, updated);
        }
    };

    return (
        <Box sx={{ flexGrow: 1, p: 3, height: '100%', overflow: 'hidden' }}>
            <Grid container spacing={3} sx={{ height: '100%' }}>
                <Grid size={{ xs: 12, md: 4 }} sx={{ height: '100%' }}>
                    <CharacterList
                        characters={characters}
                        onDelete={onDelete}
                        onImport={onImport}
                        onSelect={handleSelect}
                        selectedIndex={selectedIndex}
                    />
                </Grid>
                <Grid size={{ xs: 12, md: 8 }} sx={{ height: '100%' }}>
                    {selectedCharacter ? (
                        <CharacterDetailForm
                            character={selectedCharacter}
                            onUpdate={handleCharacterUpdate}
                        />
                    ) : (
                        <Paper sx={{ p: 3, height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <Typography variant="body1" color="text.secondary">
                                Select a character to edit details
                            </Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>
        </Box>
    );
};
