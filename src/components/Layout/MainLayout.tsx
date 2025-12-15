import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Button
} from '@mui/material';
import EditIcon from '@mui/icons-material/Edit';
import CloudDownloadIcon from '@mui/icons-material/CloudDownload';

export const MainLayout: React.FC = () => {
    const location = useLocation();

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: '80vw' }}>
            <AppBar position="static">
                <Toolbar>
                    <Typography variant="h6" component="div" sx={{ flexGrow: 0, mr: 4 }}>
                        Haze Reverb Sim
                    </Typography>

                    <Box sx={{ flexGrow: 1, display: 'flex', gap: 2 }}>

                        <Button
                            color="inherit"
                            component={Link}
                            to="/edit"
                            startIcon={<EditIcon />}
                            sx={{
                                borderBottom: location.pathname === '/edit' ? '2px solid white' : 'none',
                                borderRadius: 0
                            }}
                        >
                            キャラ編集
                        </Button>
                        <Button
                            color="inherit"
                            component={Link}
                            to="/import"
                            startIcon={<CloudDownloadIcon />}
                            sx={{
                                borderBottom: location.pathname === '/import' ? '2px solid white' : 'none',
                                borderRadius: 0
                            }}
                        >
                            キャラ作成
                        </Button>
                    </Box>
                </Toolbar>
            </AppBar>

            <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
                <Outlet />
            </Box>
        </Box>
    );
};
