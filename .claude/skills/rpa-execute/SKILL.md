---
name: rpa-execute
description: "ブラウザ自動化スキル。「ワークフローを実行」「.yamlを実行」「ブラウザ操作」「フォーム入力」「自動化」と言われたら必ずこのスキルを使用。"
---

# RPA 実行モード

YAMLからPlaywrightコードを生成し、`browser_run_code` で一括実行する。

---

## 重要: 実行はTaskに委譲する

**メインコンテキストで `browser_run_code` を直接実行しないこと。**

```
メインコンテキスト          Task (general-purpose)
─────────────────────────────────────────────────
1. JS存在確認
2. YAMLのinput:セクションで入力項目確認
3. 入力データ準備（OCR等）
4. Taskを起動 ──────────→ 5. template.jsをRead
                          6. __INPUT_DATA__を置換
                          7. browser_run_code実行
                          8. 結果を返す
←─────────────────────────
9. 改善レポート作成
```

**YAMLの読み方:**
- `input:` セクション → 入力パラメータ確認時に読む
- `steps:` セクション → フォールバック発生時のみ読む（改善レポートで改善提案するため）

---

## 概要

| 項目 | 実行モード |
|------|----------|
| 実行方式 | Playwrightコード一括実行 |
| スナップショット | 基本不要（失敗時のみMCPで取得） |
| フォールバック | 失敗ステップのみMCP補助 → 途中再開 |
| トークン消費 | 最小限 |
| JSテンプレート | `/rpa-explore` で事前生成 |

---

## 実行フロー

### フェーズ1: 準備（メインコンテキスト）

**JSテンプレートは `/rpa-explore` で生成済みが前提。**

1. `generated/<name>.template.js` の存在を確認
   - **存在しない場合**: エラー → `/rpa-explore` でJS生成を案内
2. `workflows/<name>.yaml` の `input:` セクションを読んで入力項目を確認
   - 必須項目（`required: true`）と任意項目を把握
   - 型（`type`）と説明（`description`）を確認
3. **入力ファイルをプロジェクト内にコピー**（Playwright許可ディレクトリ対策）
   ```bash
   mkdir -p input && cp "<ユーザー指定パス>" input/
   ```
   - コピー後のパス (`input/<filename>`) を `{{current_item}}` で使用
4. 入力データを準備（ユーザー指定、OCR抽出等）
5. 各入力ファイルに対してTaskで実行を起動（1件ずつ）

### フェーズ2: 実行（1件ごとにTask）

**repeat: true の場合、各ファイルに対して個別にTaskを起動する。**

```
// 1件目
Task(
  subagent_type: "general-purpose",
  description: "<workflow名> - 実行 (1/N)",
  prompt: `
    ## タスク: <workflow名> 実行

    ## 実行手順（生成済みテンプレート使用）
    1. generated/<workflow>.template.js を Read で読み込む
    2. __INPUT_DATA__ と __CURRENT_FILE__ を置換してコードを構築
    3. browser_run_code で実行
    4. 失敗時のフォールバック手順:
       a. failedStep の情報（セレクタ、hint）を確認
       b. browser_snapshot で状態確認
       c. MCP（browser_click等）で失敗したステップのみ実行
       d. startFromStep = failedStep + 1 で browser_run_code を再実行（残りのステップを継続）
       e. 再度失敗したら a に戻る

    ## 入力データ
    \`\`\`json
    {
      "extract": { ... },
      "input": { ... },
      "startFromStep": 0
    }
    \`\`\`

    **重要: constants は渡さない**
    - extract: 領収書等から抽出した値
    - input: YAMLのinputセクションで定義された値（デフォルト値含む）
    - constants: JSテンプレートに埋め込み済みなので渡さない

    ## 現在のファイル
    __CURRENT_FILE__ = "<ファイルパス>"

    ## 完了後の報告形式
    以下のJSON形式で報告すること:
    \`\`\`json
    {
      "success": true/false,
      "completedSteps": 5,
      "fallbacks": [
        {
          "stepIndex": 3,
          "stepName": "保存ボタンをクリック",
          "originalSelector": "#save-btn",
          "error": "Timeout waiting for selector",
          "resolution": {
            "method": "browser_click",
            "ref": "B42",
            "element": "青い保存ボタン"
          },
          "suggestedFix": "セレクタを [data-action='save'] に変更"
        }
      ]
    }
    \`\`\`
    - fallbacks 配列: フォールバックが発生しなければ空配列 []
    - suggestedFix: YAML改善案（セレクタ変更、wait追加等）

    ## 重要: コンテキスト節約
    - browser_run_codeの結果にはconsoleログやsnapshotが含まれるが、これらは無視してよい
    - consoleのエラー/警告は報告不要（広告やトラッキング由来のノイズが多い）
  `
)

// 2件目以降も同様に個別Task
```

### フェーズ3: 改善レポート（メインコンテキスト）

全件完了後、サブエージェントから返された `fallbacks` 配列を集約して改善レポートを作成:

```
// サブエージェントからの結果例
{
  "success": true,
  "completedSteps": 5,
  "fallbacks": [
    {
      "stepIndex": 3,
      "stepName": "保存ボタンをクリック",
      "originalSelector": "#save-btn",
      "error": "Timeout",
      "resolution": { "method": "browser_click", "ref": "B42" },
      "suggestedFix": "セレクタを [data-action='save'] に変更"
    }
  ]
}
```

**改善レポート作成:**
1. `fallbacks` が空 → レポート作成不要（完全成功）
2. `fallbacks` がある → `improvements/<workflow名>/YYYY-MM-DD.md` に出力
   - 各フォールバックの `suggestedFix` を改善提案として記載
   - 原因カテゴリを判定（YAML / SKILL / 実装）

---

## コード生成ルール

### 前提条件

**YAMLのセレクタは純粋なCSSセレクタであること。** → `rpa-docs/selectors.md` 参照

### アクション定義

→ `rpa-docs/actions.md` 参照

---

## MCPフォールバック

基本は全ステップを一括実行し、失敗したステップのみMCPで補助。

```
browser_run_code (全ステップ試行)
  ✅ Step 0-2: 成功
  ❌ Step 3: タイムアウト
  return { failedStep: 3, selector: '...' }
        ↓
MCP補助 (失敗ステップのみ)
  browser_snapshot → browser_click
        ↓
browser_run_code (startFromStep: 4 で再開)
  ✅ Step 4-7: 成功
```

**フォールバック手順:**
1. `failedStep`、`selector`、`hint` を確認
2. `browser_snapshot` で状態確認
3. MCP (`browser_click` 等) で操作（`hint` を参考に要素を特定）
4. `startFromStep` を設定して再実行

**hint フィールド:**
YAMLの各ステップに `hint` を記載すると、フォールバック時にAIがスナップショットから要素を特定する手がかりになる。
```yaml
- name: 保存ボタンをクリック
  action: click
  selector: "#save-btn"
  hint: "画面右下の青い保存ボタン"
```

---

## 生成済みファイル

```
generated/
└── <workflow>.template.js  # 生成済みコード（/rpa-explore で作成）
```

**JSテンプレートは `/rpa-explore` でYAML作成時に生成される。**

存在しない場合は `/rpa-explore` でYAML出力（→ 自動でJS生成）を実行すること。

---

## 改善レポートと改善サイクル

### 目的

**最終目標: JSテンプレートだけで全ステップが高速実行できるようにする**

フォールバック発生時は原因を分析し、適切な対応先（YAML / SKILL / 実装）を特定する。

```
実行 → フォールバック発生 → 改善レポート作成
                              ↓
                         原因カテゴリを判定
                              ↓
              ┌────────────────┼────────────────┐
              ↓                ↓                ↓
           YAML           SKILL            実装
        セレクタ修正   プロンプト改善   yaml-to-js修正
              ↓                ↓                ↓
              └────────────────┼────────────────┘
                              ↓
                         次回実行で検証
```

### 原因カテゴリの判定

フォールバック発生時、以下のフローで原因を判定:

1. **変換エラーまたは未対応アクションか？** → 実装（yaml-to-js.js）
2. **YAMLのセレクタ・条件・待機で改善可能か？** → YAML
3. **テンプレート生成プロンプトの指示不足か？** → SKILL
4. **サイト変更・一時的問題か？** → 外部要因

| 原因カテゴリ | 対応先 | 典型例 |
|--------------|--------|--------|
| YAML | workflows/*.yaml | セレクタ不適切、条件分岐不足、待機時間不足 |
| SKILL | .claude/skills/rpa-execute/SKILL.md | プロンプト指示不足、テンプレート不備 |
| 実装 | scripts/yaml-to-js.js | 新アクション未対応、変換バグ |
| 外部要因 | - | サイト変更、ネットワーク、一時的問題 |

### 改善レポート

実行後は `improvements/<workflow名>/YYYY-MM-DD.md` に出力。

**対応状況フィールド:**
- `未対応` - まだ修正を反映していない
- `解決済み` - 修正完了
- `対応不要` - 一時的な問題、または仕様上MCP必須
- `要調査` - 原因が特定できず、追加調査が必要

→ テンプレート: `references/improvement-report.md`

### フォールバック発生時の記録

```markdown
## フォールバック発生箇所

| ステップ | セレクタ | 原因 | 原因カテゴリ | 改善案 |
|---------|---------|------|--------------|--------|
| Step 5: Reason を選択 | `li:has-text('...')` | タイムアウト | YAML | セレクタを具体化 |

### 原因分析

#### 推定原因カテゴリ: YAML

**判定理由:**
- ドロップダウンの読み込みが遅かった
- セレクタが複数要素にマッチした

### 改善提案

#### YAML修正案
```yaml
# Before
- name: Reason を選択
  action: click
  selector: "li:has-text('Home <-> ...')"
  wait: 500

# After
- name: Reason を選択
  action: click
  selector: "[role='listbox'] li:has-text('Home <-> ...')"
  wait: 1000
```

#### SKILL修正案
SKILL修正不要

#### 実装修正案
実装修正不要
```

### 修正フロー

**重要: 自動修正しない。ユーザーが改善レポートを確認し、修正指示を出す。**

1. 改善レポートに改善提案を原因カテゴリ別に記載
2. ユーザーが内容を確認
3. 原因カテゴリに応じて対応:
   - **YAML**: `/rpa-explore` でYAMLを修正 + JS再生成
   - **SKILL**: SKILL.md を直接編集
   - **実装**: scripts/yaml-to-js.js を直接編集

---

## 実行例

```
ユーザー: 「myte-expense を実行して。領収書は receipt.jpg」

1. generated/myte-expense.template.js の存在確認
2. 入力データ抽出（OCR等）
3. browser_run_code で実行
4. 失敗時 → MCPフォールバック → startFromStep で再開
5. 結果を報告、改善レポート出力
```

---

## 参照

- セレクタ形式: `rpa-docs/selectors.md`
- アクション一覧: `rpa-docs/actions.md`
- 改善レポートテンプレート: `references/improvement-report.md`
