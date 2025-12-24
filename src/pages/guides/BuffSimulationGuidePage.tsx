import { Container, Typography, Box, Paper, List, ListItem, ListItemText, Divider, Breadcrumbs, Link as MuiLink } from '@mui/material';
import { Link } from 'react-router-dom';

export const BuffSimulationGuidePage = () => {
    return (
        <Container maxWidth="md" sx={{ py: 4 }}>
            <Breadcrumbs aria-label="breadcrumb" sx={{ mb: 3 }}>
                <MuiLink component={Link} to="/" underline="hover" color="inherit">
                    ホーム
                </MuiLink>
                <Typography color="text.primary">簡易シミュレーターの使い方</Typography>
            </Breadcrumbs>

            <Typography variant="h4" component="h1" gutterBottom sx={{ fontWeight: 'bold', mb: 4 }}>
                簡易バフシミュレーターの使い方
            </Typography>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    1. 目的
                </Typography>
                <Typography paragraph>
                    このツールは、連合討伐などで特定のサポートキャラクターを組み合わせた際、アタッカーに対してどの程度のバフ効果（攻撃力上昇、会心ダメージ上昇など）が付与されるか、その理論値を計算するためのものです。
                    <br />
                    実際のターン経過やスキル発動タイミングを考慮する「ターンシミュレーター」とは異なり、全バフが最大限発動した状態（最大スタックなど）を前提とした静的な計算を行います。
                </Typography>
            </Paper>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    2. パーティ編成
                </Typography>
                <Typography paragraph>
                    まず、シミュレーションを行うパーティメンバーを編成します。
                </Typography>
                <Box sx={{ my: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                    <img
                        src="/assets/guide/buff_sim_party.png"
                        alt="パーティ編成画面"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>
                <List sx={{ listStyleType: 'disc', pl: 4 }}>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="キャラクター追加" secondary="「キャラクターを追加」ドロップダウンから計算に含めたいキャラクターを選択します。" />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="削除" secondary="不要なキャラクターはゴミ箱アイコンをクリックして削除します。" />
                    </ListItem>
                </List>
                <Box sx={{ mt: 2, p: 2, bgcolor: '#fff3cd', borderRadius: 1 }}>
                    <Typography variant="body2" color="text.secondary">
                        <strong>Note:</strong> キャラクターのデータが存在しない場合は、「キャラクター編集」ページからデータを追加してください。
                    </Typography>
                </Box>
            </Paper>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    3. スキルレベルとスタック数の設定
                </Typography>
                <Typography paragraph>
                    編成したキャラクターのカードをクリックすることで、スキルレベルやExスキル（覚醒スキル）の有効化、スタック数の変更を行うことができます。
                </Typography>
                <Box sx={{ my: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                    <img
                        src="/assets/guide/buff_sim_config.png"
                        alt="スキル設定ダイアログ"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>
                <List sx={{ listStyleType: 'disc', pl: 4 }}>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="スキルレベル" secondary="キャラクターのスキルレベルを変更できます。" />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="Exスキルの有効化" secondary="覚醒スキル（Exスキル）を計算に含めるかどうかを切り替えます。" />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="スタック数" secondary="スタック可能なスキル（例: 「攻撃力アップ(累積)」など）を持つ場合、そのスタック数を指定できます。" />
                    </ListItem>
                </List>
            </Paper>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    4. アタッカー選択
                </Typography>
                <Typography paragraph>
                    編成したパーティの中から、バフを受ける対象（アタッカー兼リーダー）を選択します。
                    <br />
                    選択されたキャラクター自身のステータスやパッシブスキルに加え、他のメンバーからの支援スキル効果が計算されます。
                </Typography>
                <Box sx={{ my: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                    <img
                        src="/assets/guide/buff_sim_attacker.png"
                        alt="アタッカー選択"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>
            </Paper>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    5. シミュレーション結果の確認
                </Typography>
                <Typography paragraph>
                    画面下部に計算結果が表示されます。
                </Typography>
                <List sx={{ listStyleType: 'disc', pl: 4 }}>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="攻撃力上昇（合計）" secondary={<>基礎攻撃力に対する上昇倍率の合計です。<br /><small>例: +200% なら、基礎攻撃力の3倍になります。</small></>} />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="会心率（合計）" secondary="アタッカーの素の会心率 + バフによる上昇量。" />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="会心ダメージ（合計）" secondary="アタッカーの素の会心ダメージ + バフによる上昇量 + ハイパークリティカルダメージ。" />
                    </ListItem>
                </List>
                <Box sx={{ my: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                    <img
                        src="/assets/guide/buff_sim_result.png"
                        alt="結果の確認"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>
            </Paper>

            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" gutterBottom sx={{ fontWeight: 'bold' }}>
                    6. 個別効果のON/OFF
                </Typography>
                <Typography paragraph>
                    「シミュレーション結果」の下に表示される「適用された効果詳細」のリストでは、個別のバフ効果をクリックすることで、計算への反映をON/OFF（有効/無効）切り替えることができます。
                    特定のバフを除外した場合の効果量を確認したい場合に便利です。
                </Typography>
                <List sx={{ listStyleType: 'disc', pl: 4 }}>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="有効" secondary="通常表示" />
                    </ListItem>
                    <ListItem sx={{ display: 'list-item' }}>
                        <ListItemText primary="無効" secondary="グレーアウト（半透明）表示" />
                    </ListItem>
                </List>
                <Box sx={{ my: 3, border: '1px solid #ddd', borderRadius: 2, overflow: 'hidden' }}>
                    <img
                        src="/assets/guide/buff_sim_toggle.gif"
                        alt="個別効果のON/OFF"
                        style={{ width: '100%', height: 'auto', display: 'block' }}
                    />
                </Box>
            </Paper>
        </Container>
    );
};
