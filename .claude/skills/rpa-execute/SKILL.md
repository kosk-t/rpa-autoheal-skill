---
name: rpa-execute
description: "ブラウザ自動化スキル。「ワークフローを実行」「.yamlを実行」「ブラウザ操作」「フォーム入力」「自動化」と言われたら必ずこのスキルを使用。"
---

# RPA 実行モード

YAMLからPlaywrightコードを生成し、`playwright-cli run-code` で一括実行する。

---

## 重要: playwright-cli を使用する

**MCPツールではなく、Bash経由で `playwright-cli` コマンドを使用する。**
- 約4倍高速（MCP経由のオーバーヘッドがない）
- 同じフォールバック機能が使える

```
メインコンテキスト
─────────────────────────────────────────────────
1. JS存在確認
2. YAMLのinput:セクションで入力項目確認
3. 入力データ準備（OCR等）
4. playwright-cli open <url> --headed でブラウザ起動
5. playwright-cli run-code でテンプレート実行
6. 失敗時 → playwright-cli snapshot → フォールバック
7. 結果を報告、改善レポート作成
```

**YAMLの読み方:**
- `input:` セクション → 入力パラメータ確認時に読む
- `steps:` セクション → フォールバック発生時のみ読む（改善レポートで改善提案するため）

---

## 概要

| 項目 | 実行モード |
|------|----------|
| 実行方式 | `playwright-cli run-code` 一括実行 |
| スナップショット | 基本不要（失敗時のみ `playwright-cli snapshot`） |
| フォールバック | 失敗ステップのみ CLI 補助 → 途中再開 |
| トークン消費 | 最小限 |
| JSテンプレート | `/rpa-explore` で事前生成 |

---

## 実行フロー

### フェーズ1: 準備

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
4. 入力データを準備（ユーザー指定、OCR抽出等）

### フェーズ2: 実行

**playwright-cli コマンドで直接実行する。**

```bash
# 1. テンプレートを読み込み、入力データを埋め込んでコード文字列を作成
# 2. playwright-cli で実行

# ページを開く（--headed でブラウザ表示）
playwright-cli open "<開始URL>" --headed

# コードを実行（関数形式で渡す）
playwright-cli run-code "async (page) => { ... }"
```

**コード実行の形式:**
```bash
playwright-cli run-code "async (page) => {
  const inputData = { extract: {}, input: { first_name: 'Taro' }, startFromStep: 0 };
  // ... テンプレートの中身 ...
  return results;
}"
```

**失敗時のフォールバック手順:**
1. 結果の `failedStep` を確認（セレクタ、hint、エラー）
2. `playwright-cli snapshot` で現在の状態を取得
3. `playwright-cli click <ref>` / `fill <ref> <text>` で失敗ステップを実行
4. `startFromStep` を更新して `run-code` を再実行

### フェーズ3: 改善レポート

実行完了後、フォールバックが発生した場合は改善レポートを作成:

```json
// 実行結果の例
{
  "success": true,
  "completedSteps": ["step1: OK", "step2: OK"],
  "failedStep": {
    "step": "saveButton",
    "error": "Timeout 3000ms exceeded",
    "selector": "#save-btn"
  }
}
```

**改善レポート作成:**
1. `failedStep` がない → レポート作成不要（完全成功）
2. `failedStep` がある → `improvements/<workflow名>/YYYY-MM-DD.md` に出力
   - フォールバック内容と改善提案を記載
   - 原因カテゴリを判定（YAML / SKILL / 実装）

---

## コード生成ルール

### 前提条件

**YAMLのセレクタは純粋なCSSセレクタであること。** → `rpa-docs/selectors.md` 参照

### アクション定義

→ `rpa-docs/actions.md` 参照

---

## フォールバック

基本は全ステップを一括実行し、失敗したステップのみ CLI で補助。

```
playwright-cli run-code (全ステップ試行)
  ✅ Step 0-2: 成功
  ❌ Step 3: タイムアウト
  return { failedStep: { index: 3, selector: '...', hint: '...' } }
        ↓
CLI補助 (失敗ステップのみ)
  playwright-cli snapshot → playwright-cli click <ref>
        ↓
playwright-cli run-code (startFromStep: 4 で再開)
  ✅ Step 4-7: 成功
```

**フォールバック手順:**
```bash
# 1. スナップショット取得
playwright-cli snapshot

# 2. スナップショットから ref を特定し操作
playwright-cli click <ref>
playwright-cli fill <ref> "入力値"

# 3. startFromStep を更新して再開
playwright-cli run-code "async (page) => { ... startFromStep: 4 ... }"
```

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
3. playwright-cli open <url> --headed でブラウザ起動
4. playwright-cli run-code でテンプレート実行
5. 失敗時 → playwright-cli snapshot → CLIフォールバック → startFromStep で再開
6. 結果を報告、改善レポート出力
```

### コマンド例

```bash
# セッションをクリーンにして開始
playwright-cli session-stop-all 2>/dev/null

# ページを開く（ヘッドフル）
playwright-cli open "https://example.com" --headed

# コードを実行
playwright-cli run-code "async (page) => {
  const input = { first_name: 'Taro', last_name: 'Yamada' };
  await page.fill('#firstName', input.first_name);
  await page.fill('#lastName', input.last_name);
  return { success: true };
}"

# スナップショット取得（フォールバック時）
playwright-cli snapshot

# 要素をクリック（ref はスナップショットから取得）
playwright-cli click e42

# テキスト入力
playwright-cli fill e50 "入力テキスト"
```

---

## 参照

- セレクタ形式: `rpa-docs/selectors.md`
- アクション一覧: `rpa-docs/actions.md`
- 改善レポートテンプレート: `references/improvement-report.md`
