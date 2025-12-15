# ハゼリバBuffSim (Hazereverb Simulation)

『ハツリバーブ（ハツリバ）』の戦闘シミュレーションおよびバフ効果計算を行うWebアプリケーションです。

## 機能

*   **Wikiデータ取り込み**: WikiのHTMLソースをドラッグ＆ドロップしてキャラクターデータを取り込みます。
*   **バフシミュレーション**: 攻撃役（Attacker）と最大8人の支援役（Supporter）を配置し、バフの計算結果をシミュレーションできます。
    *   Exスキルの有効/無効切り替え
    *   スキルレベルの調整
    *   計算結果のログ表示（スキルごとの寄与度、説明ツールチップ付き）
*   **キャラクター管理**: キャラクターのステータスやスキル詳細を編集・保存できます。

## 技術スタック

*   **Frontend**: React (v19), TypeScript
*   **UI Framework**: Material UI (MUI) v7
*   **Build Tool**: Vite
*   **Testing**: Vitest

## セットアップと実行

### 必要要件
*   Node.js

### インストール

```bash
npm install
```

### 開発サーバーの起動

```bash
npm run dev
```

### テストの実行

Docker環境上でテストを実行することが推奨されています。

```bash
docker compose run --rm app npm test
```
