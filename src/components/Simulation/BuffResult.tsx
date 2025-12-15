import React from 'react';
import { Card, CardContent, Typography, Divider, Box } from '@mui/material';
import type { CalculatedBuffs } from '../../logic/buffCalculation';

interface BuffResultProps {
    results: CalculatedBuffs;
}

export const BuffResult: React.FC<BuffResultProps> = ({ results }) => {
    const formatPercent = (val: number) => `${Math.round(val)}%`;

    return (
        <Card sx={{ mt: 3, bgcolor: '#f5f5f5' }}>
            <CardContent>
                <Typography variant="h6" gutterBottom color="primary">
                    シミュレーション結果
                </Typography>
                <Divider sx={{ mb: 2 }} />

                <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 2 }}>
                    <Box sx={{ flex: '1 1 300px' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            攻撃力上昇
                        </Typography>
                        <Typography variant="h4" color="success.main">
                            +{formatPercent(results.attackIncreasePercent)}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: '1 1 300px' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            会心率 (合計)
                        </Typography>
                        <Typography variant="h4">
                            {formatPercent(results.critRateTotal)}
                        </Typography>
                    </Box>

                    <Box sx={{ flex: '1 1 300px' }}>
                        <Typography variant="subtitle2" color="text.secondary">
                            会心ダメージ (合計)
                        </Typography>
                        <Typography variant="h4">
                            {formatPercent(results.critDamageTotal)}
                        </Typography>
                    </Box>
                </Box>
            </CardContent>
        </Card>
    );
};
