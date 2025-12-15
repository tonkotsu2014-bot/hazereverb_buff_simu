import React from 'react';
import { FormControl, InputLabel, Select, MenuItem, type SelectChangeEvent, Box, Typography } from '@mui/material';
import type { ParsedCharacterData } from '../../logic/wikiParser';

interface CharacterSelectorProps {
    label: string;
    characters: ParsedCharacterData[];
    selectedCharacter: ParsedCharacterData | null;
    onSelect: (character: ParsedCharacterData | null) => void;
    helperText?: string;
}

export const CharacterSelector: React.FC<CharacterSelectorProps> = ({
    label,
    characters,
    selectedCharacter,
    onSelect,
    helperText
}) => {
    const handleChange = (event: SelectChangeEvent<string>) => {
        const name = event.target.value;
        if (name === '') {
            onSelect(null);
            return;
        }
        const char = characters.find(c => c.name === name);
        onSelect(char || null);
    };

    return (
        <Box sx={{ minWidth: 200, m: 1 }}>
            <FormControl fullWidth size="small">
                <InputLabel id={`char-select-${label}`}>{label}</InputLabel>
                <Select
                    labelId={`char-select-${label}`}
                    value={selectedCharacter?.name || ''}
                    label={label}
                    onChange={handleChange}
                >
                    <MenuItem value="">
                        <em>None</em>
                    </MenuItem>
                    {characters.map((char, idx) => (
                        <MenuItem key={`${char.name}-${idx}`} value={char.name}>
                            {char.name}
                        </MenuItem>
                    ))}
                </Select>
                {helperText && (
                    <Typography variant="caption" color="text.secondary" sx={{ ml: 1 }}>
                        {helperText}
                    </Typography>
                )}
            </FormControl>
        </Box>
    );
};
