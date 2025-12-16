import React from 'react';
import {
    Box,
    Typography,
    Paper,
    Button,
    Grid,
    Divider
} from '@mui/material';
import UploadIcon from '@mui/icons-material/Upload';
import DownloadIcon from '@mui/icons-material/Download';
import type { ParsedCharacterData } from '../logic/wikiParser';

interface SettingsPageProps {
    characters: ParsedCharacterData[];
    onImport: (data: ParsedCharacterData[]) => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ characters, onImport }) => {

    const handleExport = () => {
        const dataStr = JSON.stringify(characters, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'hazreverb_characters.json';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
    };

    const handleImport = (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const content = e.target?.result as string;
                    const parsed = JSON.parse(content);
                    if (Array.isArray(parsed)) {
                        const confirmMsg = '現在のデータは上書きされます。よろしいですか？';
                        if (window.confirm(confirmMsg)) {
                            onImport(parsed);
                            alert('インポートが完了しました。');
                        }
                    } else {
                        alert('Invalid format: Expected an array of characters.');
                    }
                } catch (error) {
                    console.error('Import failed:', error);
                    alert('Failed to parse JSON file.');
                }
            };
            reader.readAsText(file);
        }
        event.target.value = '';
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                設定
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                    データ管理
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                エクスポート
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                現在のキャラクタデータをJSONファイルとしてダウンロードします。
                            </Typography>
                            <Button
                                variant="outlined"
                                startIcon={<DownloadIcon />}
                                onClick={handleExport}
                                disabled={characters.length === 0}
                                fullWidth
                            >
                                JSONをダウンロード
                            </Button>
                        </Box>
                    </Grid>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2 }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                インポート
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                JSONファイルを読み込んでキャラクタデータを復元します。<br />
                                ※現在のデータはすべて上書きされます。
                            </Typography>
                            <Button
                                variant="outlined"
                                component="label"
                                startIcon={<UploadIcon />}
                                fullWidth
                            >
                                JSONをアップロード
                                <input
                                    type="file"
                                    accept=".json"
                                    onChange={handleImport}
                                    style={{ display: 'none' }}
                                />
                            </Button>
                        </Box>
                    </Grid>
                </Grid>
            </Paper>

            <Paper sx={{ p: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                    アプリケーション情報
                </Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" color="text.secondary">
                    Haze Reverb Simulation Helper (v{__APP_VERSION__})
                </Typography>
            </Paper>
        </Box>
    );
};
