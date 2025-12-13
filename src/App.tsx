import { useState, useEffect } from 'react';
import { ParserOverlay } from './components/WikiParser/ParserOverlay';
import { CharacterList } from './components/CharacterList';
import type { ParsedCharacterData } from './logic/wikiParser';
import {
  AppBar,
  Toolbar,
  Typography,
  Grid,
  Box,
  CssBaseline,
  createTheme,
  ThemeProvider
} from '@mui/material';
import './App.css';

const theme = createTheme({
  palette: {
    mode: 'light',
    primary: {
      main: '#2563eb', // Modern blue like Tailwind's blue-600
    },
    background: {
      default: '#f8fafc', // Slate-50
      paper: '#ffffff',
    },
    text: {
      primary: '#1e293b', // Slate-800
      secondary: '#64748b', // Slate-500
    }
  },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)', // Tailwind-like shadow
        },
      },
    },
    MuiAppBar: {
      styleOverrides: {
        root: {
          backgroundColor: '#1e293b', // Slate-800
          boxShadow: 'none',
          borderBottom: '1px solid #334155',
        }
      }
    }
  },
  typography: {
    fontFamily: '"Inter", "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
    h6: {
      fontWeight: 600,
    }
  }
});

const STORAGE_KEY = 'hazreverb_simu_characters';

function App() {
  const [characters, setCharacters] = useState<ParsedCharacterData[]>(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      return saved ? JSON.parse(saved) : [];
    } catch (e) {
      console.error('Failed to load characters from localStorage:', e);
      return [];
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(characters));
    } catch (e) {
      console.error('Failed to save characters to localStorage:', e);
    }
  }, [characters]);

  const handleAddCharacter = (character: ParsedCharacterData) => {
    setCharacters(prev => [...prev, character]);
  };

  const handleDeleteCharacter = (index: number) => {
    setCharacters(prev => prev.filter((_, i) => i !== index));
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ height: '100vh', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <AppBar position="static">
          <Toolbar>
            <Typography variant="h6" component="div" sx={{ flexGrow: 1 }}>
              Haze Reverb Battle Sim
            </Typography>
          </Toolbar>
        </AppBar>

        <Box sx={{ flex: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
          <Box sx={{ height: '100%', p: 3 }}>
            <Grid container spacing={3} sx={{ height: '100%', width: '100%' }}>
              <Grid size={{ xs: 12, md: 5 }} sx={{ height: { xs: 'auto', md: '100%' }, minWidth: 0 }}>
                <CharacterList characters={characters} onDelete={handleDeleteCharacter} />
              </Grid>
              <Grid size={{ xs: 12, md: 7 }} sx={{ height: { xs: 'auto', md: '100%' }, minWidth: 0 }}>
                <ParserOverlay onAddCharacter={handleAddCharacter} />
              </Grid>
            </Grid>
          </Box>
        </Box>
      </Box>
    </ThemeProvider>
  );
}

export default App;
