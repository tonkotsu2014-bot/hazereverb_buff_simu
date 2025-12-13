import React, { useState } from 'react';
import type { ParsedCharacterData } from '../../logic/wikiParser';
import { parseCharacterData } from '../../logic/wikiParser';
import {
    Card,
    CardContent,
    Typography,
    TextField,
    Button,
    Alert,
    Box,
    Stack
} from '@mui/material';
import ContentPasteIcon from '@mui/icons-material/ContentPaste';
import AddIcon from '@mui/icons-material/Add';

interface Props {
    onAddCharacter?: (character: ParsedCharacterData) => void;
}

export const ParserOverlay: React.FC<Props> = ({ onAddCharacter }) => {
    const [htmlSource, setHtmlSource] = useState('');
    const [result, setResult] = useState<ParsedCharacterData | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isDragging, setIsDragging] = useState(false);

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);

        const files = e.dataTransfer.files;
        if (files.length > 0) {
            const file = files[0];
            try {
                const text = await file.text();
                setHtmlSource(text);
                // Optional: Auto-parse
                // const data = parseCharacterData(text);
                // setResult(data);
            } catch (err) {
                setError('Failed to read file: ' + (err instanceof Error ? err.message : String(err)));
            }
        }
    };

    const handleParse = () => {
        setError(null);
        setResult(null);

        try {
            if (!htmlSource.trim()) {
                throw new Error('Please paste HTML source first.');
            }

            const data = parseCharacterData(htmlSource);
            setResult(data);

        } catch (err) {
            setError(err instanceof Error ? err.message : 'Unknown error');
        }
    };

    const handleAdd = () => {
        if (result && onAddCharacter) {
            onAddCharacter(result);
            setHtmlSource('');
            setResult(null);
        }
    };

    return (
        <Card sx={{ height: '100%', width: '100%', display: 'flex', flexDirection: 'column', boxShadow: 3 }}>
            <CardContent sx={{ height: '100%', display: 'flex', flexDirection: 'column', boxSizing: 'border-box' }}>
                <Box sx={{ mb: 2 }}>
                    <Typography variant="h5" component="div" gutterBottom fontWeight="bold" color="primary">
                        Import from Wiki
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                        Paste the full HTML source from the wiki page to extract character data.
                    </Typography>
                </Box>

                <Box
                    sx={{
                        mb: 2,
                        position: 'relative',
                        borderRadius: 1,
                        ...(isDragging && {
                            outline: '2px dashed',
                            outlineColor: 'primary.main',
                            bgcolor: 'action.hover'
                        })
                    }}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                >
                    <TextField
                        label="HTML Source"
                        multiline
                        rows={4}
                        fullWidth
                        variant="outlined"
                        value={htmlSource}
                        onChange={(e) => setHtmlSource(e.target.value)}
                        placeholder="Paste HTML source here or Drag & Drop a file..."
                        sx={{
                            fontFamily: 'monospace',
                            '& .MuiInputBase-root': {
                                pointerEvents: isDragging ? 'none' : 'auto' // Prevent text selection while dragging
                            }
                        }}
                        InputProps={{ sx: { fontFamily: 'monospace', fontSize: '0.8rem' } }}
                    />
                    {isDragging && (
                        <Box sx={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            right: 0,
                            bottom: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            bgcolor: 'rgba(25, 118, 210, 0.1)',
                            pointerEvents: 'none',
                            zIndex: 1
                        }}>
                            <Typography variant="h6" color="primary" fontWeight="bold">
                                Drop HTML file here
                            </Typography>
                        </Box>
                    )}
                </Box>

                <Stack direction="row" spacing={2} sx={{ mb: 3 }}>
                    <Button
                        variant="contained"
                        size="large"
                        startIcon={<ContentPasteIcon />}
                        onClick={handleParse}
                        disabled={!htmlSource}
                        sx={{ flex: 1 }}
                    >
                        Parse HTML
                    </Button>

                    {result && onAddCharacter && (
                        <Button
                            variant="contained"
                            color="success"
                            size="large"
                            startIcon={<AddIcon />}
                            onClick={handleAdd}
                            sx={{ flex: 1 }}
                        >
                            Add to List
                        </Button>
                    )}
                </Stack>

                {error && (
                    <Alert severity="error" sx={{ mb: 2, flexShrink: 0 }}>
                        {error}
                    </Alert>
                )}

                {result && (
                    <Box sx={{
                        flex: 1,
                        minHeight: 0,
                        display: 'flex',
                        flexDirection: 'column',
                        mt: 1
                    }}>
                        <Typography variant="subtitle2" sx={{ mb: 1, color: 'text.secondary', fontWeight: 'bold' }}>
                            Parsed Result Preview:
                        </Typography>
                        <Box sx={{
                            flex: 1,
                            p: 2,
                            bgcolor: '#1e1e1e',
                            color: '#d4d4d4',
                            borderRadius: 1,
                            overflow: 'auto',
                            border: '1px solid #333'
                        }}>
                            <pre style={{ margin: 0, fontSize: '0.8rem', fontFamily: 'Consolas, monospace' }}>
                                {JSON.stringify(result, null, 2)}
                            </pre>
                        </Box>
                    </Box>
                )}
            </CardContent>
        </Card>
    );
};
