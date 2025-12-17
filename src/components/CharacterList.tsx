import React, { useState } from 'react';
import { parseCharacterData } from '../logic/wikiParser';
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
    TextField,
    InputAdornment,
    Stack,
    Collapse
} from '@mui/material';
import PersonIcon from '@mui/icons-material/Person';
import DeleteIcon from '@mui/icons-material/Delete';
import AddCircleOutlineIcon from '@mui/icons-material/AddCircleOutline';
import AddIcon from '@mui/icons-material/Add';
import SearchIcon from '@mui/icons-material/Search';
import FilterListIcon from '@mui/icons-material/FilterList';

interface Props {
    characters: ParsedCharacterData[];
    onDelete?: (index: number) => void;
    onSelect?: (index: number) => void;
    onAdd?: (index: number) => void;
    onCreateNew?: () => void;
    onCharacterImported?: (character: ParsedCharacterData) => void;
    selectedIndex?: number | null;
}

export const CharacterList: React.FC<Props> = ({ characters, onDelete, onSelect, onAdd, onCreateNew, onCharacterImported, selectedIndex }) => {
    // We lift the state up if onSelect is provided, otherwise local state (though mostly unused currently without onSelect in parent)
    const [localSelected, setLocalSelected] = useState<number | null>(null);
    const [isDragOver, setIsDragOver] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterRole, setFilterRole] = useState<string | null>(null);
    const [showFilter, setShowFilter] = useState(true);

    const handleSelect = (index: number) => {
        if (onSelect) {
            onSelect(index);
        } else {
            setLocalSelected(index);
        }
    };

    const handleDragOver = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(true);
    };

    const handleDragLeave = (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);
    };

    const handleDrop = async (e: React.DragEvent) => {
        e.preventDefault();
        setIsDragOver(false);

        const files = Array.from(e.dataTransfer.files);
        const htmlFile = files.find(f => f.type === 'text/html' || f.name.endsWith('.html'));

        if (htmlFile && onCharacterImported) {
            const text = await htmlFile.text();
            try {
                const parsed = parseCharacterData(text);
                onCharacterImported(parsed);
            } catch (error) {
                console.error('Failed to parse dropped file:', error);
                alert('ファイルの読み込みに失敗しました。');
            }
        }
    };

    const getRole = (char: ParsedCharacterData) => {
        return char.role || (char.type?.includes('支援') ? 'Supporter' : char.type?.includes('攻撃') ? 'Attacker' : char.type?.includes('防御') ? 'Defender' : char.type?.includes('超越') ? 'Transcendence' : char.type?.includes('火力') ? 'Firepower' : 'Unknown');
    };

    const filteredCharactersWithIndex = characters.map((c, i) => ({ ...c, originalIndex: i }))
        .filter(c => {
            const matchesSearch = c.name?.toLowerCase().includes(searchTerm.toLowerCase()) || false;
            const role = getRole(c);
            const matchesRole = filterRole ? role === filterRole : true;
            return matchesSearch && matchesRole;
        });

    const currentSelected = onSelect ? selectedIndex : localSelected;

    const getRoleLabel = (role: string) => {
        switch (role) {
            case 'Attacker': return '攻撃';
            case 'Supporter': return '支援';
            case 'Defender': return '防御';
            case 'Transcendence': return '超越';
            case 'Firepower': return '火力';
            default: return role;
        }
    };

    const getRoleColor = (role: string) => {
        switch (role) {
            case 'Supporter': return '#2e7d32';
            case 'Attacker': return '#d32f2f';
            case 'Defender': return '#1565c0';
            case 'Transcendence': return '#6a1b9a'; // Purple
            case 'Firepower': return '#e64a19'; // Deep Orange
            default: return 'action.active';
        }
    };

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
                    null
                }
                sx={{
                    borderBottom: '1px solid',
                    borderColor: 'divider',
                    py: 2,
                    px: 3
                }}
            />

            <Box sx={{ px: 3, py: showFilter ? 2 : 1, borderBottom: '1px solid', borderColor: 'divider', transition: 'padding 0.2s' }}>
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'start', mb: showFilter ? 1.5 : 0 }}>
                    {showFilter ? (
                        <TextField
                            fullWidth
                            size="small"
                            placeholder="名前で検索..."
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            InputProps={{
                                startAdornment: (
                                    <InputAdornment position="start">
                                        <SearchIcon color="action" />
                                    </InputAdornment>
                                ),
                            }}
                        />
                    ) : (
                        <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', minHeight: 32, overflow: 'hidden' }}>
                            <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'nowrap', overflow: 'hidden' }}>
                                <Typography variant="body2" color="text.secondary" sx={{ whiteSpace: 'nowrap', display: 'flex', alignItems: 'center' }}>
                                    <SearchIcon sx={{ fontSize: 20, mr: 0.5 }} />
                                    {searchTerm || filterRole ? '' : 'フィルターなし'}
                                </Typography>
                                {(searchTerm || filterRole) && (
                                    <Stack direction="row" spacing={1} alignItems="center">
                                        {searchTerm && (
                                            <Chip label={searchTerm} size="small" variant="outlined" sx={{ height: 24 }} />
                                        )}
                                        {filterRole && (
                                            <Chip
                                                label={getRoleLabel(filterRole)}
                                                size="small"
                                                color="primary"
                                                variant="filled"
                                                sx={{ height: 24 }}
                                            />
                                        )}
                                    </Stack>
                                )}
                            </Box>
                        </Box>
                    )}
                    <IconButton
                        onClick={() => setShowFilter(!showFilter)}
                        color={showFilter ? 'primary' : 'default'}
                        size={showFilter ? 'medium' : 'small'}
                        sx={{
                            border: '1px solid',
                            borderColor: showFilter ? 'primary.main' : 'divider',
                            borderRadius: 1,
                            height: showFilter ? 40 : 32,
                            width: showFilter ? 40 : 32,
                            transition: 'all 0.2s'
                        }}
                    >
                        <FilterListIcon fontSize={showFilter ? 'medium' : 'small'} />
                    </IconButton>
                </Box>

                <Collapse in={showFilter}>
                    <Stack direction="row" spacing={1}>
                        {['Attacker', 'Supporter', 'Defender', 'Transcendence', 'Firepower'].map((role) => (
                            <Chip
                                key={role}
                                label={getRoleLabel(role)}
                                size="small"
                                onClick={() => setFilterRole(filterRole === role ? null : role)}
                                color={filterRole === role ? 'primary' : 'default'}
                                variant={filterRole === role ? 'filled' : 'outlined'}
                                sx={{
                                    borderColor: filterRole === role ? 'primary.main' : 'divider',
                                }}
                            />
                        ))}
                        {/* Clear filter chip */}
                        {filterRole && (
                            <Chip
                                label="クリア"
                                size="small"
                                onDelete={() => setFilterRole(null)}
                                onClick={() => setFilterRole(null)}
                            />
                        )}
                    </Stack>
                </Collapse>
            </Box>

            {onCreateNew && (
                <Box
                    sx={{
                        borderBottom: '1px solid',
                        borderColor: 'divider',
                        backgroundColor: isDragOver ? 'primary.main' : 'background.paper',
                    }}
                >
                    <ListItemButton
                        onClick={onCreateNew}
                        onDragOver={handleDragOver}
                        onDragLeave={handleDragLeave}
                        onDrop={handleDrop}
                        sx={{
                            py: 2,
                            px: 3,
                            color: isDragOver ? 'white' : 'primary.main',
                            justifyContent: 'center',
                            backgroundColor: isDragOver ? 'primary.main' : 'primary.alpha',
                            '&:hover': {
                                backgroundColor: 'primary.light',
                                color: 'white',
                                '& .MuiSvgIcon-root': {
                                    color: 'white'
                                }
                            },
                            transition: 'all 0.2s',
                            display: 'flex',
                            gap: 1
                        }}
                    >
                        <AddIcon sx={{ color: 'inherit', transition: 'color 0.2s' }} />
                        <Typography fontWeight={700} color="inherit">
                            {isDragOver ? 'HTMLファイルをドロップして追加' : '新しいキャラを追加 (HTMLドロップ可)'}
                        </Typography>
                    </ListItemButton>
                </Box>
            )}

            <CardContent sx={{ flex: 1, overflow: 'auto', p: 0 }}>
                {characters.length === 0 ? (
                    <Box sx={{ p: 4, textAlign: 'center', opacity: 0.7 }}>
                        <Typography variant="body1" fontWeight={500}>キャラクターがいません</Typography>
                        <Typography variant="body2" sx={{ mt: 1 }}>
                            上のボタンからキャラを追加してください。
                        </Typography>
                    </Box>
                ) : (
                    <List disablePadding>
                        {filteredCharactersWithIndex.map((char) => {
                            const index = char.originalIndex;
                            return (
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
                                                const role = getRole(char);
                                                return getRoleColor(role);
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
                                                        const role = getRole(char);
                                                        return getRoleColor(role);
                                                    })(),
                                                    borderColor: (() => {
                                                        const role = getRole(char);
                                                        const color = getRoleColor(role);
                                                        // Convert hex to rgba manually for simple alpha
                                                        // Or just use the hex for border with some opacity or just as is
                                                        // For consistency with previous code let's just use a map or simple string manip if possible, 
                                                        // but previously it was distinct. Let's return the opaque color or 'divider'
                                                        return color === 'action.active' ? 'divider' : color + '80'; // 50% opacity hack if hex
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
                            );
                        })}
                    </List>
                )}
            </CardContent>
            {/* Replaced Preview with Detail Form in parent, so removing preview pane here */}
        </Card>
    );
};
