import React, { useMemo } from 'react';
import {
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
    ReferenceLine
} from 'recharts';
import { Box, Typography } from '@mui/material';
import type { Action } from '../../logic/turnSimulator';

interface SimulationResultGraphProps {
    simulationResults: Action[];
    selectedCharacterId: string | null;
    party: { id: string; name: string }[];
}

const ATTRIBUTE_COLORS: Record<string, string> = {
    'Attack': '#d32f2f', // Red
    'Defense': '#1565c0', // Blue
    'CritRate': '#ff9800', // Orange
    'CritDamage': '#9c27b0', // Purple
    'Support': '#2e7d32', // Green
    'DamageReduction': '#009688', // Teal
    'Mobility': '#795548', // Brown
    'Hp': '#e91e63' // Pink
};

const ATTRIBUTE_TRANSLATION: Record<string, string> = {
    'Attack': '攻撃力',
    'Defense': '防御力',
    'Hp': 'HP',
    'CritRate': 'クリティカル率',
    'CritDamage': 'クリティカルダメージ',
    'Support': '支援力',
    'DamageReduction': 'ダメージ軽減',
    'Mobility': '機動力',
    'Armor': '装甲',
    'HyperCritDamage': 'ハイパークリティカルダメージ'
};

export const SimulationResultGraph: React.FC<SimulationResultGraphProps> = ({
    simulationResults,
    selectedCharacterId,
    party
}) => {
    const data = useMemo(() => {
        if (!selectedCharacterId || !simulationResults) return [];

        const charIndex = party.findIndex(p => p.id === selectedCharacterId);
        if (charIndex === -1) return [];

        const chartData = [];

        // Create a data point for each Global Turn where this character (or anyone) acted.
        // Actually, we want to show the state at the end of each action or just the actions where state changed?
        // Ideally, we plot the state "At the moment of action".
        // Let's iterate through all actions to build a timeline.

        // We can just plot every action point.
        // For distinct X-axis, we might want to filter or just show all.

        for (const action of simulationResults) {
            const state = action.characterStates[charIndex];
            const skills = state ? state.receivedSkills : [];

            // Aggregate effects
            const aggregatedEffects: Record<string, number> = {};
            skills.forEach(skill => {
                skill.effects.forEach(effect => {
                    const attr = effect.attribute;
                    const val = effect.type === 'Debuff' ? -effect.value : effect.value;
                    aggregatedEffects[attr] = (aggregatedEffects[attr] || 0) + val;
                });
            });

            // If no effects, we still record 0s? Or just skip?
            // Better to record 0s so the line goes down.

            // We need a consistent set of keys for the lines.
            // We'll collect all keys encountered effectively?
            // Or just predefined common ones.

            chartData.push({
                name: `R${action.round}-T${action.globalTurn}`,
                globalTurn: action.globalTurn,
                round: action.round,
                actor: action.actorName,
                isActor: action.actorIndex === charIndex,
                ...aggregatedEffects
            });
        }

        return chartData;
    }, [simulationResults, selectedCharacterId, party]);

    // Collect all attributes present in the data to create lines dynamically
    const presentAttributes = useMemo(() => {
        const attrs = new Set<string>();
        data.forEach(item => {
            Object.keys(item).forEach(key => {
                if (key !== 'name' && key !== 'globalTurn' && key !== 'round' && key !== 'actor' && key !== 'isActor') {
                    attrs.add(key);
                }
            });
        });
        return Array.from(attrs);
    }, [data]);

    if (!selectedCharacterId) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 1, height: '100%' }}>
                <Typography color="text.secondary" variant="body2">
                    履歴を確認したいキャラを選択してください
                </Typography>
            </Box>
        );
    }

    if (data.length === 0) {
        return (
            <Box sx={{ flex: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">No data available.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: '100%', minHeight: 400, p: 1 }}>
            <ResponsiveContainer width="100%" height="100%">
                <LineChart
                    data={data}
                    margin={{
                        top: 5,
                        right: 30,
                        left: 20,
                        bottom: 5,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-45} textAnchor="end" height={60} />
                    <YAxis label={{ value: '効果量 (%)', angle: -90, position: 'insideLeft' }} />
                    <Tooltip
                        contentStyle={{ fontSize: '0.8rem', backgroundColor: 'rgba(255, 255, 255, 0.95)' }}
                        formatter={(value: number | undefined, name: string | number | undefined) => {
                            const nameStr = String(name || '');
                            return [
                                `${value !== undefined && value > 0 ? '+' : ''}${value !== undefined ? Math.round(value * 100) / 100 : 0}%`,
                                ATTRIBUTE_TRANSLATION[nameStr] || nameStr
                            ];
                        }}
                        labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                                const dataPoint = payload[0].payload;
                                return `${label} (${dataPoint.actor}の行動)`;
                            }
                            return label;
                        }}
                    />
                    <Legend wrapperStyle={{ fontSize: '0.8rem' }} />

                    <ReferenceLine y={0} stroke="#666" />

                    {presentAttributes.map(attr => (
                        <Line
                            key={attr}
                            type="stepAfter" // Use step line for discrete turn-based changes
                            dataKey={attr}
                            name={ATTRIBUTE_TRANSLATION[attr] || attr}
                            stroke={ATTRIBUTE_COLORS[attr] || '#8884d8'}
                            strokeWidth={2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </Box>
    );
};
