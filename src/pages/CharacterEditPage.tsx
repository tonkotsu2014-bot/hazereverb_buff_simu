import React, { useState } from 'react';

import { Box, Grid, Typography, Paper, Dialog } from '@mui/material';
import { CharacterList } from '../components/CharacterList';
import { CharacterDetailForm } from '../components/CharacterDetailForm';
import { ParserOverlay } from '../components/WikiParser/ParserOverlay';
import type { ParsedCharacterData } from '../logic/wikiParser';

interface Props {
    characters: ParsedCharacterData[];
    onDelete: (index: number) => void;
    onUpdate: (index: number, updated: ParsedCharacterData) => void;
    onAddCharacter: (character: ParsedCharacterData) => void;
}

export const CharacterEditPage: React.FC<Props> = ({ characters, onDelete, onUpdate, onAddCharacter }) => {
    // navigate is unused if we do SPA style, but maybe keep for safe keeping? actually remove it if unused.
    // const navigate = useNavigate(); 
    const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
    const [isCreating, setIsCreating] = useState(false);

    const handleSelect = (index: number) => {
        setSelectedIndex(index);
        setIsCreating(false);
    };

    const handleCreateNew = () => {
        setSelectedIndex(null);
        setIsCreating(true);
    };

    const handleNewCharacterAdded = (character: ParsedCharacterData) => {
        onAddCharacter(character);
        setIsCreating(false);
        // Optimistically select the new character (current length = index of new char)
        setSelectedIndex(characters.length);
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
                        onCreateNew={handleCreateNew}
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
                                Select a character to edit details or create a new one
                            </Typography>
                        </Paper>
                    )}
                </Grid>
            </Grid>

            {/* Creation Modal */}
            <Dialog
                open={isCreating}
                onClose={() => setIsCreating(false)}
                maxWidth="lg"
                fullWidth
                PaperProps={{
                    sx: { height: '85vh', maxHeight: '800px' }
                }}
            >
                <ParserOverlay onAddCharacter={handleNewCharacterAdded} />
            </Dialog>
        </Box>
    );
};
