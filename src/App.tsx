import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { CharacterEditPage } from './pages/CharacterEditPage';
import type { ParsedCharacterData } from './logic/wikiParser';
import { BuffSimulationPage } from './pages/BuffSimulationPage';
import { SettingsPage } from './pages/SettingsPage';
import {
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

  const handleUpdateCharacter = (index: number, updated: ParsedCharacterData) => {
    setCharacters(prev => {
      const newChars = [...prev];
      newChars[index] = updated;
      return newChars;
    });
  };

  const handleImportCharacters = (data: ParsedCharacterData[]) => {
    setCharacters(data);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<Navigate to="/edit" replace />} />
            <Route
              path="edit"
              element={
                <CharacterEditPage
                  characters={characters}
                  onAddCharacter={handleAddCharacter}
                  onDelete={handleDeleteCharacter}
                  onUpdate={handleUpdateCharacter}
                />
              }
            />

            <Route
              path="simulation"
              element={
                <BuffSimulationPage
                  characters={characters}
                />
              }
            />
            <Route
              path="settings"
              element={
                <SettingsPage
                  characters={characters}
                  onImport={handleImportCharacters}
                />
              }
            />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
