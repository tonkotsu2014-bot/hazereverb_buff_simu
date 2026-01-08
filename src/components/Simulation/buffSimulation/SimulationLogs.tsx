import React from 'react';
import { Box, Typography, Accordion, AccordionSummary, AccordionDetails, Table, TableBody, TableCell, TableHead, TableRow } from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import type { BuffModifier } from '../../../logic/buffCalculation';

interface SimulationLogsProps {
    modifiers: BuffModifier[];
}

export const SimulationLogs: React.FC<SimulationLogsProps> = ({ modifiers }) => {
    // Only show debub actions that have specific calculation type (or we can show all)
    // User asked solely for "Actionsを表示".
    // But specifically they cared about Support Scaling details.

    // Let's show a table of all actions, with columns for base/factor.
    const debuggableModifiers = modifiers.filter(m => m.isActive && (
        m.calculationType === 'SupportScaling' ||
        m.calculationType === 'SilentScaling' ||
        m.attribute === 'Support' // Show Support stat changes (self buffs)
    ));

    if (debuggableModifiers.length === 0) return null;

    return (
        <Box sx={{ mt: 2 }}>
            <Accordion variant="outlined" disableGutters>
                <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                    <Typography variant="body2" fontWeight="bold">
                        Debug Details (Support/Silent Scaling)
                    </Typography>
                </AccordionSummary>
                <AccordionDetails sx={{ p: 0, bgcolor: '#f8f8f8', maxHeight: 300, overflow: 'auto' }}>
                    <Table size="small">
                        <TableHead>
                            <TableRow>
                                <TableCell>Character</TableCell>
                                <TableCell>Skill</TableCell>
                                <TableCell>Type</TableCell>
                                <TableCell>Base</TableCell>
                                <TableCell>Factor</TableCell>
                                <TableCell>Result</TableCell>
                            </TableRow>
                        </TableHead>
                        <TableBody>
                            {debuggableModifiers.map((mod) => (
                                <TableRow key={mod.id}>
                                    <TableCell>{mod.sourceCharacterName}</TableCell>
                                    <TableCell>{mod.skillName}</TableCell>
                                    <TableCell>{mod.calculationType}</TableCell>
                                    <TableCell>
                                        {mod.calculationType === 'SupportScaling'
                                            ? `${mod.scalingBase?.toFixed(0)} (Support)`
                                            : `${mod.scalingBase} (Silent)`}
                                    </TableCell>
                                    <TableCell>
                                        {mod.scalingFactor}%
                                    </TableCell>
                                    <TableCell>
                                        {mod.value.toFixed(2)}%
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </AccordionDetails>
            </Accordion>
        </Box>
    );
};
