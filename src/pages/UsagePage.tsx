import React from 'react';
import {
    Box,
    Container,
    Typography,
    Paper,
    Divider,
    Alert,
    AlertTitle,
    Card,
    CardMedia,
    Grid,
    Accordion,
    AccordionSummary,
    AccordionDetails
} from '@mui/material';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome';
import PostAddIcon from '@mui/icons-material/PostAdd';
import EditIcon from '@mui/icons-material/Edit';

export const UsagePage: React.FC = () => {
    return (
        <Container maxWidth="lg" sx={{ py: 4 }}>
            <Box sx={{ mb: 4 }}>
                <Typography variant="h4" fontWeight={800} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                    <AutoAwesomeIcon fontSize="large" color="primary" />
                    使い方ガイド
                </Typography>
                <Typography variant="body1" color="text.secondary">
                    キャラクターの追加・編集方法についての操作説明です。
                </Typography>
            </Box>



            <Paper sx={{ p: 4, mb: 4 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <PostAddIcon color="secondary" />
                    1. キャラクターの追加方法
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight={600} color="primary.main">
                        Step 1: 追加ボタンをクリック
                    </Typography>
                    <Typography paragraph>
                        キャラクター一覧の上部にある「新しいキャラを追加」ボタンをクリックします。
                    </Typography>
                    <Box sx={{ maxWidth: 600, mx: 'auto', my: 2, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                        <img src="/assets/guide/guide_add_button.png" alt="追加ボタン" style={{ width: '100%', display: 'block' }} />
                    </Box>
                </Box>

                <Box sx={{ mb: 3 }}>
                    <Typography variant="h6" gutterBottom fontWeight={600} color="primary.main">
                        Step 2: HTMLソースの取得と入力
                    </Typography>
                    <Typography paragraph>
                        WikiからHTMLソースを取得して入力します。入力画面の「HTMLソースの取得方法」を開くと詳細な手順を確認できます。
                    </Typography>
                    <Alert severity="success" variant="outlined" sx={{ mb: 2 }}>
                        Wikiページで右クリックし「ページのソースを表示」からコピーするか、「名前を付けて保存（HTMLのみ）」したファイルをドラッグ＆ドロップしてください。
                    </Alert>
                    <Grid container spacing={2}>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                                <img src="/assets/guide/guide_wiki_instructions.png" alt="Wikiソース取得手順" style={{ width: '100%', display: 'block' }} />
                            </Box>
                        </Grid>
                        <Grid item xs={12} md={6}>
                            <Box sx={{ border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                                <img src="/assets/guide/guide_import_parse.png" alt="インポート画面" style={{ width: '100%', display: 'block' }} />
                            </Box>
                        </Grid>
                    </Grid>
                </Box>

                <Box>
                    <Typography variant="h6" gutterBottom fontWeight={600} color="primary.main">
                        Step 3: 解析と追加
                    </Typography>
                    <Typography paragraph>
                        「HTMLを解析」ボタンをクリックします。解析が成功するとプレビューが表示され、「リストに追加」ボタンが現れます。
                        「リストに追加」をクリックして完了です。
                    </Typography>
                    <Box sx={{ maxWidth: 600, mx: 'auto', my: 2, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                        <img src="/assets/guide/guide_import_add.png" alt="リストに追加" style={{ width: '100%', display: 'block' }} />
                    </Box>
                </Box>
            </Paper>

            <Paper sx={{ p: 4 }}>
                <Typography variant="h5" fontWeight={700} gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <EditIcon color="secondary" />
                    2. キャラクターの編集方法
                </Typography>
                <Divider sx={{ my: 2 }} />

                <Typography paragraph>
                    追加したキャラクターのステータスやスキル詳細を編集できます。
                    左側のリストから編集したいキャラクターをクリックして選択してください。
                </Typography>

                <Accordion sx={{ mb: 1 }} defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600}>基本情報・ステータスの編集</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography paragraph>
                            右側のフォームで、名前や各ステータス（HP、攻撃力など）を直接入力して修正できます。
                        </Typography>
                        <Box sx={{ maxWidth: 800, mx: 'auto', mb: 2, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                            <img src="/assets/guide/guide_edit_basics.png" alt="基本情報の編集" style={{ width: '100%', display: 'block' }} />
                        </Box>
                    </AccordionDetails>
                </Accordion>

                <Accordion sx={{ mb: 1 }}>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600}>役割・タイプの設定</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography paragraph>
                            役割（攻撃型、支援型など）はドロップダウンメニューから変更可能です。
                        </Typography>
                        <Box sx={{ maxWidth: 600, mx: 'auto', mb: 2, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                            <img src="/assets/guide/guide_edit_role.png" alt="役割の変更" style={{ width: '100%', display: 'block' }} />
                        </Box>
                    </AccordionDetails>
                </Accordion>

                <Accordion defaultExpanded>
                    <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                        <Typography fontWeight={600}>スキルの詳細編集</Typography>
                    </AccordionSummary>
                    <AccordionDetails>
                        <Typography paragraph fontWeight={600}>効果の追加</Typography>
                        <Typography paragraph>各スキルパネル内の「効果を追加」ボタンをクリックします。</Typography>
                        <Box sx={{ maxWidth: 800, mx: 'auto', mb: 3, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                            <img src="/assets/guide/guide_skill_add.png" alt="効果の追加" style={{ width: '100%', display: 'block' }} />
                        </Box>

                        <Typography paragraph fontWeight={600}>効果の設定</Typography>
                        <Typography paragraph>
                            追加された効果カードで、タイプ（バフ/デバフ）、属性、計算方法、範囲、値、持続ターン数を設定します。
                        </Typography>
                        <Box sx={{ maxWidth: 800, mx: 'auto', mb: 2, border: '1px solid #eee', borderRadius: 2, overflow: 'hidden' }}>
                            <img src="/assets/guide/guide_skill_edit.png" alt="スキル効果の編集" style={{ width: '100%', display: 'block' }} />
                        </Box>
                    </AccordionDetails>
                </Accordion>
            </Paper>
        </Container>
    );
};
