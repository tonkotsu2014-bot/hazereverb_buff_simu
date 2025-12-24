import { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { MainLayout } from './components/Layout/MainLayout';
import { HomePage } from './pages/HomePage';
import { CharacterEditPage } from './pages/CharacterEditPage';
import type { ParsedCharacterData } from './logic/wikiParser';
import { BuffSimulationPage } from './pages/BuffSimulationPage';
import { TurnSimulationPage } from './pages/TurnSimulationPage';

import { TurnSimulationGuidePage } from './pages/TurnSimulationGuidePage';
import { SettingsPage } from './pages/SettingsPage';
import { CharacterEditGuidePage } from './pages/CharacterEditGuidePage';
import { BuffSimulationGuidePage } from './pages/BuffSimulationGuidePage';
import {
  CssBaseline,
  createTheme,
  ThemeProvider
} from '@mui/material';
import './App.css';
import defaultCharacters from './data/default_characters.json';
import { calculateHash } from './logic/hashUtils';

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
      if (saved) {
        const parsed = JSON.parse(saved);
        // Only support new format ({ hash, data })
        // Legacy (array) format is deliberately ignored to enforce migration/reset
        if (parsed.data && Array.isArray(parsed.data)) {
          return parsed.data;
        }
      }
      // Initial load or empty/invalid storage -> use default characters
      // default_characters.json uses the new structure: { hash: "...", data: [...] }
      return defaultCharacters.data as ParsedCharacterData[];
    } catch (e) {
      console.error('Failed to load characters from localStorage:', e);
      // Fallback
      return defaultCharacters.data as ParsedCharacterData[];
    }
  });

  useEffect(() => {
    const saveToStorage = async () => {
      try {
        const hash = await calculateHash(characters);
        const dataToSave = {
          hash: hash,
          data: characters
        };
        localStorage.setItem(STORAGE_KEY, JSON.stringify(dataToSave));
      } catch (e) {
        console.error('Failed to save characters to localStorage:', e);
      }
    };
    saveToStorage();
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

  const handleReset = () => {
    setCharacters(defaultCharacters.data as ParsedCharacterData[]);
  };

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MainLayout />}>
            <Route index element={<HomePage />} />
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
              path="turn-simulation"
              element={
                <TurnSimulationPage
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
                  onReset={handleReset}
                />
              }
            />
            <Route path="guide/character-edit" element={<CharacterEditGuidePage />} />
            <Route path="guide/buff-simulation" element={<BuffSimulationGuidePage />} />
            <Route path="guide/turn-simulation" element={<TurnSimulationGuidePage />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </ThemeProvider>
  );
}

export default App;
