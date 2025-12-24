import { Box, Container, Typography, Grid, Card, CardActionArea, CardContent, useTheme, Stack, Link } from '@mui/material';
import { useNavigate, Link as RouterLink } from 'react-router-dom';
import EditIcon from '@mui/icons-material/Edit';
import CalculateIcon from '@mui/icons-material/Calculate';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import SettingsIcon from '@mui/icons-material/Settings';

export const HomePage = () => {
    const navigate = useNavigate();
    const theme = useTheme();

    const menuItems = [
        {
            title: 'キャラクター編集',
            description: (
                <>
                    シミュレーションに使用するキャラクターのステータスやスキルレベルを設定します。
                    <Link href="https://w.atwiki.jp/hazereverb/" target="_blank" rel="noopener" underline="hover" onClick={(e) => e.stopPropagation()}>ハツリバwiki</Link>
                    のキャラクターのデータのHTMLソースからキャラクターを追加できます。<br />
                    <Link component={RouterLink} to="/guide/character-edit" onClick={(e) => e.stopPropagation()} underline="hover">使い方はこちら</Link>
                </>
            ),
            path: '/edit',
            icon: <EditIcon sx={{ fontSize: 40 }} />,
            color: theme.palette.primary.main
        },
        {
            title: '簡易シミュレーター',
            description: (
                <>
                    パーティーの編成によって得られるバフを簡易的にシミュレーションします。理論値のチェックなどに利用。<br />
                    <Link component={RouterLink} to="/guide/buff-simulation" onClick={(e) => e.stopPropagation()} underline="hover">使い方はこちら</Link>
                </>
            ),
            path: '/simulation',
            icon: <CalculateIcon sx={{ fontSize: 40 }} />,
            color: '#10b981' // Emerald-500
        },
        {
            title: 'ターンシミュレーター',
            description: '実際のターン経過に伴うバフの適用状況をできるだけ正確にシミュレーションします。また、各ターンごとのバフによるステータス変化状況をグラフで確認できます。',
            path: '/turn-simulation',
            icon: <ShowChartIcon sx={{ fontSize: 40 }} />,
            color: '#f59e0b' // Amber-500
        },
        {
            title: '設定・データ管理',
            description: 'キャラクターデータのインポート・エクスポートを行います。',
            path: '/settings',
            icon: <SettingsIcon sx={{ fontSize: 40 }} />,
            color: '#64748b' // Slate-500
        }
    ];

    return (
        <Container maxWidth="lg" sx={{ py: 8 }}>
            <Box sx={{ mb: 6, textAlign: 'center' }}>
                <Typography variant="h2" component="h1" gutterBottom sx={{ fontWeight: 800, color: 'text.primary', letterSpacing: '-0.025em' }}>
                    Haze Reverb Buff Simulator
                </Typography>
                <Card sx={{ maxWidth: '900px', mx: 'auto', mt: 4, bgcolor: 'background.paper' }}>
                    <CardContent sx={{ p: 4 }}>
                        <Typography variant="h6" color="text.secondary" sx={{ lineHeight: 1.8 }}>
                            <Link href="https://www.hazereverb.jp/" target="_blank" rel="noopener" underline="hover">Haze Reverb(ハツリバ)</Link>の連合討伐で最適な編成を模索するためのシミュレーターです。<br />
                            簡易バフシミュレーションやターンシミュレーターで支援結果によるバフの推移を可視化し、連合討伐の最適編成構築を支援します。
                        </Typography>
                    </CardContent>
                </Card>
            </Box>

            <Box sx={{ maxWidth: '900px', mx: 'auto' }}>
                <Grid container spacing={4}>
                    {menuItems.map((item) => (
                        <Grid size={{ xs: 12, sm: 6, md: 6 }} key={item.path}>
                            <Card sx={{ height: '100%' }}>
                                <CardActionArea
                                    onClick={() => navigate(item.path)}
                                    sx={{ height: '100%', display: 'flex', flexDirection: 'column', alignItems: 'stretch', justifyContent: 'flex-start' }}
                                >
                                    <CardContent sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', gap: 2 }}>
                                        <Box sx={{ color: item.color }}>
                                            {item.icon}
                                        </Box>
                                        <Typography variant="h6" component="div">
                                            {item.title}
                                        </Typography>
                                        <Typography variant="body2" color="text.secondary">
                                            {item.description}
                                        </Typography>
                                    </CardContent>
                                </CardActionArea>
                            </Card>
                        </Grid>
                    ))}
                </Grid>
            </Box>
        </Container>
    );
};
