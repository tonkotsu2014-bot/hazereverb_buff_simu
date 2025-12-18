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
import DeleteForeverIcon from '@mui/icons-material/DeleteForever';
import type { ParsedCharacterData } from '../logic/wikiParser';

import { calculateHash } from '../logic/hashUtils';

interface SettingsPageProps {
    characters: ParsedCharacterData[];
    onImport: (data: ParsedCharacterData[]) => void;
    onReset: () => void;
}

export const SettingsPage: React.FC<SettingsPageProps> = ({ characters, onImport, onReset }) => {
    const [dataHash, setDataHash] = React.useState<string>('');

    React.useEffect(() => {
        calculateHash(characters).then(hash => setDataHash(hash));
    }, [characters]);

    const handleExport = async () => {
        const hash = await calculateHash(characters);
        const exportData = {
            hash: hash,
            data: characters
        };
        const dataStr = JSON.stringify(exportData, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `hazreverb_characters_${hash.substring(0, 8)}.json`;
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

                    let charactersToImport: ParsedCharacterData[] | null = null;

                    if (Array.isArray(parsed)) {
                        // Legacy format: raw array
                        charactersToImport = parsed;
                    } else if (parsed && typeof parsed === 'object' && Array.isArray(parsed.data)) {
                        // New format: { hash, data }
                        // Optional: Verify hash?
                        // For now just assume valid if structure matches
                        charactersToImport = parsed.data;
                    }

                    if (charactersToImport) {
                        const confirmMsg = '現在のデータは上書きされます。よろしいですか？';
                        if (window.confirm(confirmMsg)) {
                            onImport(charactersToImport);
                            alert('インポートが完了しました。');
                        }
                    } else {
                        alert('Invalid format: Expected an array of characters or { hash, data } object.');
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

    const handleReset = () => {
        const confirmMsg = 'データを初期状態にリセットします。現在の変更はすべて失われます。よろしいですか？';
        if (window.confirm(confirmMsg)) {
            onReset();
            alert('データをリセットしました。');
        }
    };

    return (
        <Box sx={{ p: 3, maxWidth: 800, mx: 'auto' }}>
            <Typography variant="h5" fontWeight={700} gutterBottom sx={{ mb: 3 }}>
                設定
            </Typography>

            <Paper sx={{ p: 3, mb: 3 }}>
                <Typography variant="h6" gutterBottom fontWeight={600}>
                    データ管理 (Data ID: {dataHash.substring(0, 8)})
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Grid container spacing={3}>
                    <Grid size={{ xs: 12, md: 6 }}>
                        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                    エクスポート
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    現在のキャラクタデータをJSONファイルとしてダウンロードします。
                                </Typography>
                            </Box>
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
                        <Box sx={{ p: 2, bgcolor: 'background.default', borderRadius: 2, height: '100%', display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                            <Box>
                                <Typography variant="subtitle1" fontWeight={600} gutterBottom>
                                    インポート
                                </Typography>
                                <Typography variant="body2" color="text.secondary" paragraph>
                                    JSONファイルを読み込んでキャラクタデータを復元します。<br />
                                    ※現在のデータはすべて上書きされます。
                                </Typography>
                            </Box>
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
                    <Grid size={{ xs: 12 }}>
                        <Box sx={{ p: 2, bgcolor: '#fff1f2', borderRadius: 2, border: '1px solid #fecdd3' }}>
                            <Typography variant="subtitle1" fontWeight={600} gutterBottom color="error">
                                データリセット
                            </Typography>
                            <Typography variant="body2" color="text.secondary" paragraph>
                                すべてのデータを削除し、初期状態（デフォルトキャラクターのみ）に戻します。<br />
                                ※この操作は取り消せません。
                            </Typography>
                            <Button
                                variant="contained"
                                color="error"
                                startIcon={<DeleteForeverIcon />}
                                onClick={handleReset}
                                fullWidth
                            >
                                データを初期状態にリセット
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
