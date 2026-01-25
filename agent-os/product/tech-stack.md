# Tech Stack

## Core Technologies

### AI & Automation

| Component | Technology | Purpose |
|-----------|------------|---------|
| **AI Engine** | Claude Code with Skills | ワークフロー生成、失敗分析、リカバリ判断 |
| **Browser Automation** | Playwright | 高速・安定したブラウザ操作 |
| **AI-Browser Bridge** | Playwright MCP | 失敗時のスナップショット取得、状態理解、AIリカバリ |

### Language & Runtime

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Primary Language** | JavaScript (CommonJS) | シンプルで実行可能なコード生成 |
| **Runtime** | Node.js | JavaScript実行環境 |
| **Package Manager** | npm | 依存関係管理 |

### Workflow Definition

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Workflow Format** | YAML | 人間が読める宣言的ワークフロー定義 |
| **YAML Parser** | js-yaml | YAMLファイルのパース |
| **Schema Validation** | AJV + JSON Schema | YAMLスキーマの検証 |
| **Schema Formats** | ajv-formats | URI等の形式バリデーション |
| **Knowledge Store** | SKILL.md (Markdown) | Claudeへのドメイン知識定義 |

### Version Control & Collaboration

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Version Control** | Git | ワークフローとSkillの履歴管理 |
| **Repository** | GitHub | コード管理、Issue追跡 |

## Development Tools

### Testing & Quality

| Component | Technology | Purpose |
|-----------|------------|---------|
| **Test Framework** | Jest | ユニットテスト、統合テスト |
| **E2E Testing** | Playwright | ワークフロー実行のE2Eテスト |

## Architecture Patterns

### Execution Model

```
[自然言語] → [Claude] → [YAML] → [Code Generator] → [JavaScript Code]
                                                          ↓
                                                  [高速決定論的実行]
                                                          ↓
                                                  [失敗検知] → [Playwright MCP] → [Claude] → [AIリカバリ]
                                                          ↓
                                                  [失敗分析] → [YAML自動修正]
```

### Key Design Principles

1. **ハイブリッド実行**: 通常時は AI 推論なしで高速実行、失敗時のみ AI 介入
2. **タスク分離**: メインコンテキストをクリーンに保ち、スケーラビリティを確保
3. **宣言的ワークフロー**: YAMLによる人間可読なワークフロー定義
4. **知識の永続化**: Skill + YAML を組織の知識資産として蓄積

## File Structure

```
project/
├── workflows/
│   └── *.yaml                # ワークフロー定義
├── schemas/
│   └── workflow.schema.json  # JSON Schema定義
├── scripts/
│   └── yaml-to-js.js         # YAML→JSコンバーター
├── generated/
│   └── *.template.js         # 生成されたJavaScriptコード
├── tests/
│   ├── workflow-schema.test.js   # スキーマバリデーションテスト
│   ├── yaml-to-js.test.js        # コンバーターテスト
│   ├── integration.test.js       # 統合テスト
│   └── helpers/                  # テストヘルパー
├── run-workflow.js           # ワークフロー実行エントリーポイント
└── package.json              # プロジェクト設定
```

## Dependencies

### Production Dependencies

```json
{
  "playwright": "^1.57.0",    // ブラウザ自動化
  "js-yaml": "^4.1.1",        // YAMLパース
  "ajv": "^8.17.1",           // JSON Schemaバリデーション
  "ajv-formats": "^3.0.1"     // 追加フォーマット検証
}
```

### Development Dependencies

```json
{
  "jest": "^30.2.0"           // テストフレームワーク
}
```
