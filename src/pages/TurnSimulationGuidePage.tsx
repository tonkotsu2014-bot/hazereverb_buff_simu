import { Container, Typography, Box, Paper, List, ListItem, ListItemText, Divider, Breadcrumbs, Link as MuiLink, Alert } from '@mui/material';
import { Link } from 'react-router-dom';
import ShowChartIcon from '@mui/icons-material/ShowChart';

export const TurnSimulationGuidePage = () => {
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
                <MuiLink component={Link} to="/" underline="hover" color="inherit">
                    ホーム
                </MuiLink>
                <Typography color="text.primary">ターンシミュレーターの使い方</Typography>
            </Breadcrumbs>

            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
                ターンシミュレーターの使い方
            </Typography>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    1. 概要
                </Typography>
                <Typography paragraph>
                    ターンシミュレーターは、実際の戦闘経過（Round 1, Round 2...）を模倣し、各ターンの開始時・行動時・終了時などに発動するスキル効果を積算して計算します。
                    <br />
                    簡易シミュレーターとは異なり、「3ターン目までのバフの推移」や「スキル発動タイミングによる切れ目」などを正確に確認できます。
                </Typography>
            </Paper>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    2. パーティー編成と設定
                </Typography>
                <Typography paragraph>
                    まず計算対象となるキャラクターを編成します。
                </Typography>
                <Box sx={{ my: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                    <img
                        src="/assets/guide/turn_sim_setup.png"
                        alt="初期設定"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>
                <List sx={{ listStyleType: 'disc', pl: 4 }}>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="キャラ追加" secondary="左側のキャラクターリストから「＋」ボタンを押してパーティーに追加します。最大9人まで編成可能です。" />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="詳細設定" secondary="追加されたカード内で、ドラッグによる順番変更や、削除が行えます。また、支援対象の設定や死亡ラウンドの設定も可能です。" />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="シミュレーション開始" secondary="ラウンド数（デフォルト5）を指定し、「シミュレーション開始」ボタンをクリックします。" />
                    </ListItem>
                </List>
            </Paper>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    3. 結果の確認（全体・グラフ）
                </Typography>
                <Typography paragraph>
                    計算が完了すると、行動ログとステータス推移グラフが表示されます。
                </Typography>
                <Box sx={{ my: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                    <img
                        src="/assets/guide/turn_sim_graph.png"
                        alt="結果グラフ"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>
                <List sx={{ listStyleType: 'disc', pl: 4 }}>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="行動ログ（上部）" secondary="各ラウンド・ターンごとの行動順が表示されます。ここをクリックすることで、その時点でのステータスを確認できます。" />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="推移グラフ（下部）" secondary="攻撃力やクリティカル率などが、ターン経過とともにどう変化するかをグラフで確認できます。" />
                    </ListItem>
                </List>
                <Alert severity="info" sx={{ mt: 2 }}>
                    グラフを表示するには、ログ（上部）のいずれかのターンをクリックして、対象キャラクターを選択してください。
                </Alert>
            </Paper>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    4. 詳細データとバフ内訳
                </Typography>
                <Typography paragraph>
                    より詳細な数値を確認したい場合は、「詳細 (表)」タブに切り替えます。
                </Typography>
                <Box sx={{ my: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                    <img
                        src="/assets/guide/turn_sim_details.png"
                        alt="詳細一覧表"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>
                <Typography paragraph>
                    表の各行をクリックすると、そのタイミングで適用されているバフ・デバフの完全な内訳（どのキャラのどのスキルによる効果か）がポップアップで表示されます。
                </Typography>
                <Box sx={{ my: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                    <img
                        src="/assets/guide/turn_sim_popup.png"
                        alt="バフ内訳"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>
            </Paper>
        </Container>
    );
};
