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
import type { ParsedCharacterData } from '../../logic/wikiParser';
// Graph Calculation Logic Helper Functions

export const ATTRIBUTE_TRANSLATION: Record<string, string> = {
    'Attack': '攻撃力',
    'Defense': '防御力',
    'Hp': 'HP',
    'CritRate': 'クリティカル率',
    'CritDamage': 'クリティカルダメージ',
    'Support': '支援力',
    'DamageReduction': 'ダメージ軽減',
    'Mobility': '機動力',
    'Armor': '装甲',
    'HyperCritDamage': 'ハイパークリティカルダメージ',
    'CombinedCritDamage': '統合クリティカルダメージ', // New
    'Evasion': 'ダメージ回避率',
    'Silent': '静寂',
};

export const ATTRIBUTE_COLORS: Record<string, string> = {
    'Attack': '#d32f2f', // Red
    'Defense': '#1565c0', // Blue
    'CritRate': '#ff9800', // Orange
    'CritDamage': '#9c27b0', // Purple
    'Support': '#2e7d32', // Green
    'DamageReduction': '#009688', // Teal
    'Mobility': '#795548', // Brown
    'Hp': '#e91e63', // Pink
    'CombinedCritDamage': '#6a1b9a', // Deep Purple
    'Evasion': '#9e9e9e', // Grey
    'Silent': '#607d8b', // Blue Grey
};

/**
 * Retrieves the base stat value for a character securely.
 * Handles both string ('1000') and number (1000) formats.
 */
export const getCharacterBaseStat = (character: ParsedCharacterData | undefined, attribute: string): number => {
    if (!character || !character.stats) return 0;

    // wikiParser.ts might have stats as CharacterStats (strings) or numeric object (custom edits)
    // ParsedCharacterData stats is: CharacterStats | { [key: string]: number }
    // CharacterStats keys are: hp, attack, defense, critRate, critDamage, speed
    // Attribute keys are: Hp, Attack, Armor/Defense, CritRate, CritDamage, Mobility/Speed

    // Map standard attribute names to CharacterStats keys
    let key: string = attribute;
    switch (attribute) {
        case 'Hp': key = 'hp'; break;
        case 'Attack': key = 'attack'; break;
        case 'Defense':
        case 'Armor': key = 'defense'; break;
        case 'CritRate': key = 'critRate'; break;
        case 'CritDamage': key = 'critDamage'; break;
        case 'Mobility':
        case 'Speed': key = 'speed'; break;
        case 'Support': key = 'Support'; break; // Special case for supporter
    }

    const val = (character.stats as any)[key];

    if (val === undefined) return 0;
    if (typeof val === 'number') return val;
    if (typeof val === 'string') {
        // Remove non-numeric chars except dot/minus
        const match = val.replace(/,/g, '').match(/-?\d+(\.\d+)?/);
        return match ? parseFloat(match[0]) : 0;
    }
    return 0;
};

/**
 * Determines if base stats should be added to the display value.
 * Rule: Attack and HP show buff ONLY. Others show Base + Buff.
 */
export const shouldAddBaseStats = (attribute: string): boolean => {
    return attribute !== 'Attack' && attribute !== 'Hp';
};

/**
 * Calculates the final value for graph display.
 */
export const calculateDisplayValue = (
    attribute: string,
    baseValue: number,
    buffValue: number
): number => {
    if (shouldAddBaseStats(attribute)) {
        return baseValue + buffValue;
    }
    return buffValue;
};

/**
 * Calculates the Combined Critical Damage (Base Crit Dmg + Buff Crit Dmg + Buff Hyper Crit Dmg).
 * Base Hyper Crit is usually 0 or not tracked separately as a base stat in this context, 
 * usually it comes from buffs.
 */
export const calculateCombinedCritDamage = (
    baseCritDamage: number,
    buffCritDamage: number,
    buffHyperCritDamage: number
): number => {
    return baseCritDamage + buffCritDamage + buffHyperCritDamage;
};

interface SimulationResultGraphProps {
    simulationResults: Action[];
    selectedCharacterId: string | null;
    party: (ParsedCharacterData & { id: string; name: string })[];
}

export const SimulationResultGraph: React.FC<SimulationResultGraphProps> = ({
    simulationResults,
    selectedCharacterId,
    party
}) => {
    const [hiddenAttributes, setHiddenAttributes] = React.useState<Set<string>>(new Set());

    const handleLegendClick = (e: any) => {
        const { dataKey } = e;
        setHiddenAttributes(prev => {
            const next = new Set(prev);
            if (next.has(dataKey)) {
                next.delete(dataKey);
            } else {
                next.add(dataKey);
            }
            return next;
        });
    };

    const { chartData, activeAttributes } = useMemo(() => {
        if (!selectedCharacterId || !simulationResults) return { chartData: [], activeAttributes: [] };

        const charIndex = party.findIndex(p => p.id === selectedCharacterId);
        if (charIndex === -1) return { chartData: [], activeAttributes: [] };

        const character = party[charIndex];

        // Pre-fetch base stats
        const attributesToCheck = [
            'Attack', 'Defense', 'Hp', 'CritRate', 'CritDamage', 'Support', 'Mobility', 'DamageReduction', 'Evasion'
        ];

        const baseStats: Record<string, number> = {};
        attributesToCheck.forEach(attr => {
            baseStats[attr] = getCharacterBaseStat(character, attr);
        });

        // Armor alias
        baseStats['Armor'] = baseStats['Defense'];

        const chartData = [];
        const activeBuffs = new Set<string>(['Attack', 'CritRate', 'CombinedCritDamage']);

        for (const action of simulationResults) {
            const state = action.characterStates[charIndex];
            const skills = state ? state.receivedSkills : [];

            // Aggregate effects (Buffs)
            const aggregatedBuffs: Record<string, number> = {};
            skills.forEach(skill => {
                skill.effects.forEach(effect => {
                    const attr = effect.attribute;
                    const val = effect.type === 'Debuff' ? -effect.value : effect.value;
                    aggregatedBuffs[attr] = (aggregatedBuffs[attr] || 0) + val;
                });
            });

            // Identify active buffs (non-zero change)
            Object.entries(aggregatedBuffs).forEach(([attr, val]) => {
                if (Math.abs(val) > 0.001) { // Floating point safety
                    activeBuffs.add(attr);
                }
            });

            // Calculate Final Display Values
            const dataPoint: any = {
                name: action.globalTurn.toString(),
                globalTurn: action.globalTurn,
                round: action.round,
                actor: action.actorName,
                isActor: action.actorIndex === charIndex,
            };

            // Process all buffs + standard attributes
            const allAttributes = new Set([...attributesToCheck, ...Object.keys(aggregatedBuffs)]);

            allAttributes.forEach(attr => {
                const buffVal = aggregatedBuffs[attr] || 0;
                const baseVal = baseStats[attr] || 0;
                dataPoint[attr] = calculateDisplayValue(attr, baseVal, buffVal);
            });

            // Special: Combined Critical Damage
            const baseCrit = baseStats['CritDamage'] || 0;
            const buffCrit = aggregatedBuffs['CritDamage'] || 0;
            const buffHyper = aggregatedBuffs['HyperCritDamage'] || 0;

            dataPoint['CombinedCritDamage'] = calculateCombinedCritDamage(baseCrit, buffCrit, buffHyper);

            // Special handling for CombinedCritDamage: active if CritDamage or HyperCritDamage has buff
            if (Math.abs(buffCrit) > 0.001 || Math.abs(buffHyper) > 0.001) {
                activeBuffs.add('CombinedCritDamage');
            }

            chartData.push(dataPoint);
        }

        return { chartData, activeAttributes: Array.from(activeBuffs) };
    }, [simulationResults, selectedCharacterId, party]);

    // Use calculated active attributes for lines
    const presentAttributes = useMemo(() => {
        return activeAttributes;
    }, [activeAttributes]);

    if (!selectedCharacterId) {
        return (
            <Box sx={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', bgcolor: '#f5f5f5', borderRadius: 1, height: '100%' }}>
                <Typography color="text.secondary" variant="body2">
                    履歴を確認したいキャラを選択してください
                </Typography>
            </Box>
        );
    }

    if (chartData.length === 0) {
        return (
            <Box sx={{ flex: 1, p: 2 }}>
                <Typography variant="body2" color="text.secondary">No data available.</Typography>
            </Box>
        );
    }

    return (
        <Box sx={{ width: '100%', height: 'auto', p: 1, display: 'flex', justifyContent: 'center' }}>
            <ResponsiveContainer width="100%" aspect={4 / 3}>
                <LineChart
                    data={chartData}
                    margin={{
                        top: 20,
                        right: 10,
                        left: 0,
                        bottom: 60,
                    }}
                >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                        dataKey="name"
                        tick={{ fontSize: 9 }}
                        interval={0}
                        angle={0}
                        textAnchor="middle"
                        height={60}
                    />
                    <YAxis
                        label={{ value: '値 / 効果量 (%)', angle: -90, position: 'insideLeft', style: { fontSize: '0.8rem' } }}
                        tick={{ fontSize: 10 }}
                    />
                    <Tooltip
                        contentStyle={{ fontSize: '0.75rem', backgroundColor: 'rgba(255, 255, 255, 0.95)', padding: '5px' }}
                        formatter={(value: number | undefined, name: string | number | undefined) => {
                            const nameStr = String(name || '');
                            // Heuristic: Attack/Hp value > 0 means buff +
                            const isBuffOnly = nameStr === 'Attack' || nameStr === 'Hp';
                            const prefix = (isBuffOnly && value !== undefined && value > 0) ? '+' : '';
                            const unit = (nameStr === 'Silent' || nameStr === 'Support') ? '' : '%';

                            return [
                                `${prefix}${value !== undefined ? Math.round(value * 100) / 100 : 0}${unit}`,
                                ATTRIBUTE_TRANSLATION[nameStr] || nameStr
                            ];
                        }}
                        labelFormatter={(label, payload) => {
                            if (payload && payload.length > 0) {
                                const dataPoint = payload[0].payload;
                                return `${label} (${dataPoint.actor})`;
                            }
                            return label;
                        }}
                    />
                    <Legend
                        wrapperStyle={{ fontSize: '0.75rem', cursor: 'pointer', userSelect: 'none' }}
                        onClick={handleLegendClick}
                        verticalAlign="top"
                        height={36}
                    />

                    <ReferenceLine y={0} stroke="#666" />

                    {presentAttributes.map(attr => (
                        <Line
                            key={attr}
                            type="stepAfter"
                            dataKey={attr}
                            name={ATTRIBUTE_TRANSLATION[attr] || attr}
                            stroke={ATTRIBUTE_COLORS[attr] || '#8884d8'}
                            strokeWidth={attr === 'CombinedCritDamage' ? 3 : 2}
                            dot={{ r: 3 }}
                            activeDot={{ r: 5 }}
                            connectNulls
                            hide={hiddenAttributes.has(attr)}
                        />
                    ))}
                </LineChart>
            </ResponsiveContainer>
        </Box>
    );
};
