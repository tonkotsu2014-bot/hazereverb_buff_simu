import React from 'react';
import { Outlet, Link, useLocation } from 'react-router-dom';
import {
    AppBar,
    Toolbar,
    Typography,
    Box,
    Button,
    IconButton,
    Drawer,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    useTheme,
    useMediaQuery,
    Divider
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import EditIcon from '@mui/icons-material/Edit';
import CalculateIcon from '@mui/icons-material/Calculate';
import SettingsIcon from '@mui/icons-material/Settings';
import GitHubIcon from '@mui/icons-material/GitHub';
import ViewTimelineIcon from '@mui/icons-material/ViewTimeline';

export const MainLayout: React.FC = () => {
    const location = useLocation();
    const theme = useTheme();
    const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
    const [mobileOpen, setMobileOpen] = React.useState(false);

    const handleDrawerToggle = () => {
        setMobileOpen(!mobileOpen);
    };

    const drawer = (
        <Box onClick={handleDrawerToggle} sx={{ textAlign: 'center' }}>
            <Typography variant="h6" sx={{ my: 2 }}>
                ハツリバ・バフシミュ
            </Typography>
            <Divider />
            <List>
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/edit" selected={location.pathname === '/edit'}>
                        <ListItemIcon><EditIcon /></ListItemIcon>
                        <ListItemText primary="キャラ編集" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/simulation" selected={location.pathname === '/simulation'}>
                        <ListItemIcon><CalculateIcon /></ListItemIcon>
                        <ListItemText primary="シミュレーション" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/turn-simulation" selected={location.pathname === '/turn-simulation'}>
                        <ListItemIcon><ViewTimelineIcon /></ListItemIcon>
                        <ListItemText primary="ターンシミュ" />
                    </ListItemButton>
                </ListItem>
                <ListItem disablePadding>
                    <ListItemButton component={Link} to="/settings" selected={location.pathname === '/settings'}>
                        <ListItemIcon><SettingsIcon /></ListItemIcon>
                        <ListItemText primary="設定" />
                    </ListItemButton>
                </ListItem>
            </List>
        </Box>
    );

    return (
        <Box sx={{ display: 'flex', flexDirection: 'column', height: '100vh', width: { xs: '100%', md: '80vw' }, mx: 'auto' }}>
            <AppBar position="static">
                <Toolbar>
                    {isMobile && (
                        <IconButton
                            color="inherit"
                            aria-label="open drawer"
                            edge="start"
                            onClick={handleDrawerToggle}
                            sx={{ mr: 2 }}
                        >
                            <MenuIcon />
                        </IconButton>
                    )}

                    <Typography variant="h6" component="div" sx={{ flexGrow: isMobile ? 1 : 0, mr: 4 }}>
                        {isMobile ? 'バフシミュ' : 'ハツリバ・バフシミュレーター'}
                    </Typography>

                    {!isMobile && (
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
                                to="/simulation"
                                startIcon={<CalculateIcon />}
                                sx={{
                                    borderBottom: location.pathname === '/simulation' ? '2px solid white' : 'none',
                                    borderRadius: 0
                                }}
                            >
                                シミュレーター
                            </Button>
                            <Button
                                color="inherit"
                                component={Link}
                                to="/turn-simulation"
                                startIcon={<ViewTimelineIcon />}
                                sx={{
                                    borderBottom: location.pathname === '/turn-simulation' ? '2px solid white' : 'none',
                                    borderRadius: 0
                                }}
                            >
                                ターンシミュ
                            </Button>
                            <Button
                                color="inherit"
                                component={Link}
                                to="/settings"
                                startIcon={<SettingsIcon />}
                                sx={{
                                    borderBottom: location.pathname === '/settings' ? '2px solid white' : 'none',
                                    borderRadius: 0,
                                    ml: 'auto'
                                }}
                            >
                                設定
                            </Button>
                            <IconButton
                                color="inherit"
                                component="a"
                                href="https://github.com/tonkotsu2014-bot/hazereverb_buff_simu"
                                target="_blank"
                                rel="noopener noreferrer"
                                sx={{ ml: 1 }}
                            >
                                <GitHubIcon />
                            </IconButton>
                        </Box>
                    )}
                </Toolbar>
            </AppBar>

            <Box component="nav">
                <Drawer
                    variant="temporary"
                    open={mobileOpen}
                    onClose={handleDrawerToggle}
                    ModalProps={{
                        keepMounted: true, // Better open performance on mobile.
                    }}
                    sx={{
                        display: { xs: 'block', sm: 'none' },
                        '& .MuiDrawer-paper': { boxSizing: 'border-box', width: 240 },
                    }}
                >
                    {drawer}
                </Drawer>
            </Box>

            <Box component="main" sx={{ flexGrow: 1, overflow: 'hidden', bgcolor: 'background.default' }}>
                <Outlet />
            </Box>
        </Box>
    );
};
