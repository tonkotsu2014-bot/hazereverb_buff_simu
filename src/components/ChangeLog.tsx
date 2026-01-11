import React from 'react';
import { Box, Typography, Paper, Divider, Chip, Accordion, AccordionSummary, AccordionDetails } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';

interface ChangeLogEntry {
    version: string;
    date: string;
    changes: string[];
}

const changeLogs: ChangeLogEntry[] = [
    {
        version: '2.3.0',
        date: '2026-01-11',
        changes: [
            'イカロス戦のシミュレーションに対応: ボスの行動時に支援キャラクターのバフ・デバフを解除するギミック（解除不可を除く）を実装'
        ]
    },
    {
        version: '2.2.0',
        date: '2026-01-08',
        changes: [
            '簡易シミュレーターの機能強化: 詳細なデバッグ情報（Action List）の表示機能を追加',
            'バフ一覧の改善: 支援キャラクターの自己バフや他者からの支援バフを個別に表示し、ON/OFF切り替えが可能に',
            '計算ロジックの改善: 支援スケーリング（SupportScaling）等の計算根拠（基礎値・係数）を表示',
            'UI調整: バフ結果テーブルのデザインを更新し、有効/無効の状態を視覚的にわかりやすく変更'
        ]
    }
];

export const ChangeLog: React.FC = () => {
    return (
        <Paper sx={{ p: 0, mt: 3, overflow: 'hidden' }}>
            <Accordion defaultExpanded={false} disableGutters elevation={0}>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="h6" fontWeight={600}>
                        更新履歴 (Change Log)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ pt: 0 }}>
                    <Divider sx={{ mb: 2 }} />
                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3 }}>
                        {changeLogs.map((log) => (
                            <Box key={log.version}>
                                <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                                    <Chip label={`v${log.version}`} color="primary" size="small" />
                                    <Typography variant="caption" color="text.secondary">
                                        {log.date}
                                    </Typography>
                                </Box>
                                <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                    {log.changes.map((change, index) => (
                                        <li key={index}>
                                            <Typography variant="body2" sx={{ lineHeight: 1.6 }}>
                                                {change}
                                            </Typography>
                                        </li>
                                    ))}
                                </ul>
                            </Box>
                        ))}
                    </Box>
                </AccordionDetails>
            </Accordion>
        </Paper>
    );
};
