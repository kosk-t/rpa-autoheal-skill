# Browser Automation Skill

**AIで作って、高速・毎回確実に動作。失敗してもその場でAIがリカバリ、学習して次回から自動で改善**
![cover](documents/images/image-0.jpg)
![concept-1](documents/images/image-1.jpg)
![concept-2](documents/images/image-2.jpg)

## 特徴

**決定論的な高速実行 + 失敗時のみAIが介入**

```
YAML定義 → Playwrightコード生成 → 直接実行（AI推論なし・高速）
                                       │
                                       ↓ 失敗時のみ
                                    AIがその場でリカバリ → 業務完了
                                       │
                                       ↓ 同時に
                                    改善レポート生成 → YAMLを修正 → 次回から高速実行で成功
```

- **誰でも作れる**: 自然言語で指示しながらブラウザを操作、対話的にワークフローを生成
![make](documents/images/image-3.jpg)
- **高速**: YAMLから生成したコードを直接実行。毎回AIが判断するエージェントより圧倒的に速い
- **確実**: 同じYAMLなら同じ動作。結果がブレない
- **その場でリカバリ**: 失敗してもAIが状況を見て回復、業務を完了させる
![execute](documents/images/image-4.jpg)
- **自己改善**: 失敗パターンを学習してYAMLを修正。同じ失敗は二度としない
![learn](documents/images/image-5.jpg)

## セットアップ

### 1. Playwright MCP サーバーの追加

```bash
claude mcp add playwright npx @playwright/mcp@latest
```

### 2. 依存関係のインストール

```bash
npm install
```

## 使い方

### ワークフローを作成する（探索モード）

ブラウザを操作しながら、ステップを記録してワークフローを作成。

```
「https://example.com のワークフローを探索モードで作成して」
「ワークフローを作成して」
「/rpa-explore https://example.com のフォーム入力を自動化して」
```

### ワークフローを実行する

作成済みのワークフローを実行。失敗したステップはAIが自動でリカバリを試みる。

```
「sample-expense を実行して。領収書は receipt.jpg」
「amazon-search を実行」
「/rpa-execute sample-expense」
```

### ワークフローを改善する

実行時に生成された改善レポートを基に、ワークフローを修正。

```
「改善レポートを基にYAMLを修正して」
```

## 開発者向け

### テスト

```bash
npm test                    # 全テスト
npm run test:schema         # スキーマ検証テスト
npm run test:integration    # 統合テスト
```

### スタンドアロン実行

Claude を介さずにワークフローを直接実行（CI/CD向け）。

```bash
node run-workflow.js <workflow-name> <input-path> --extract "<json>"
```

詳細は `run-workflow.js --help` を参照。
