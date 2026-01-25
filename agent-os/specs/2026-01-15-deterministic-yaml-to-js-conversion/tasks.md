# タスク一覧: 決定論的YAML→JS変換システム

## 概要
総タスク数: 22

## 目標
YAML→JS変換を決定論的（非AI依存）にし、AIはYAML生成時のスキーマ検証・修正のみを担当することで、ワークフロー実行の再現性と信頼性を向上させる。

## タスク一覧

### スキーマ定義レイヤー

#### タスクグループ1: YAMLスキーマ定義（JSON Schema形式）
**依存関係:** なし

- [x] 1.0 スキーマ定義の完成
  - [x] 1.1 スキーマ検証用テストを2-8件作成
    - 有効なYAMLが検証を通過することを確認
    - 無効なYAMLが適切なエラーを返すことを確認
    - `when`句の構造化形式の検証テスト
    - `hint`フィールドの配置検証テスト
  - [x] 1.2 ワークフロースキーマの基本構造を定義
    - ファイル: `schemas/workflow.schema.json`
    - トップレベル: `name`, `description`, `input`, `constants`, `steps`, `output`
    - 既存の`workflows/amazon-product-search.yaml`を参考に設計
  - [x] 1.3 `input`セクションのスキーマを定義
    - パラメータ名をキーとしたオブジェクト形式
    - 各パラメータ: `type`, `required`, `description`, `example`, `default`
    - 型: `string`, `number`, `boolean`, `image`
  - [x] 1.4 `steps`配列のスキーマを定義
    - 共通フィールド: `name`（必須）, `hint`（任意、ステップ直下）
    - アクションタイプ別の定義: `navigate`, `fill`, `click`, `press`, `wait`, `playwright_code`
    - `fallback.mode`フィールドは削除（スキーマに含めない）
  - [x] 1.5 条件ロジック（`when`句）のスキーマを定義
    - 構造化形式: `{ field: string, op: string, value: any }`
    - 演算子: `==`, `!=`, `>`, `<`, `>=`, `<=`
    - 複数条件: `match: "all"` (AND) または `match: "any"` (OR)
    - 参照可能変数: `extract.*`, `input.*`, `constants.*`
  - [x] 1.6 変数補間形式のスキーマを定義
    - 単一形式: `${extract.fieldName}`, `${input.paramName}`, `${constants.value}`
    - 正規表現パターンで検証
  - [x] 1.7 スキーマ検証テストの実行
    - タスク1.1で作成したテストのみ実行
    - 全テストがパスすることを確認

**受け入れ基準:**
- タスク1.1で作成した2-8件のテストがパス
- JSON Schemaが正しく定義されている
- 既存のYAML構造との整合性が取れている
- `fallback.mode`が廃止され、`hint`がステップ直下に配置されている

---

### 変換スクリプトレイヤー

#### タスクグループ2: 決定論的変換スクリプト（yaml-to-js.js）
**依存関係:** タスクグループ1

- [x] 2.0 変換スクリプトの完成
  - [x] 2.1 変換スクリプト用テストを2-8件作成
    - 基本的なYAML→JS変換の正確性テスト
    - 同一入力から同一出力が生成されることを検証（決定論性）
    - `when`句のJS if文変換テスト
    - `playwright_code`ブロックがそのままコピーされることを検証
  - [x] 2.2 スクリプト基本構造を作成
    - ファイル: `scripts/yaml-to-js.js`
    - Node.jsスクリプト形式
    - CLI引数: 入力YAMLパス、出力JSパス
    - 依存: `js-yaml`, `ajv`（JSON Schema検証）
  - [x] 2.3 スキーマ検証機能を実装
    - JSON Schemaを読み込み
    - YAMLをパースしてスキーマ検証
    - 検証失敗時は具体的なエラーメッセージ（違反箇所、期待値、実際の値）を出力
  - [x] 2.4 アクションタイプ別の変換ロジックを実装
    - `navigate`: `page.goto(url)` + `waitForLoadState`
    - `fill`: `page.fill(selector, value)`
    - `click`: `page.click(selector)`
    - `press`: `page.press(selector, key)`
    - `wait`: `page.waitForSelector(selector, { timeout })`
    - `playwright_code`: コードブロックをそのままコピー
  - [x] 2.5 条件ロジック（`when`句）の変換を実装
    - YAML: `when: { field: "extract.amount", op: ">", value: 10000 }`
    - JS: `if (extract.amount > 10000) { ... }`
    - 複数条件時の結合: `match: all` → `&&`, `match: any` → `||`
  - [x] 2.6 変数補間の変換を実装
    - `${extract.fieldName}` → テンプレートリテラル形式
    - `${input.paramName}` → `input.paramName`
    - `${constants.value}` → `constants.value`
  - [x] 2.7 JSテンプレート出力を実装
    - 出力先: `generated/<workflow-name>.template.js`
    - プレースホルダー: `__INPUT_DATA__`, `__CURRENT_FILE__`
    - 既存の`amazon-product-search.template.js`の構造を踏襲
    - ステップメタデータ（name, action, selector, hint）を含む
  - [x] 2.8 変換スクリプトテストの実行
    - タスク2.1で作成したテストのみ実行
    - 全テストがパスすることを確認

**受け入れ基準:**
- タスク2.1で作成した2-8件のテストがパス
- 同一YAMLから常に同一JSが生成される（決定論性）
- AI解釈なしの純粋な機械的変換
- エラーメッセージが明確で具体的

---

### 統合レイヤー

#### タスクグループ3: 実行環境との統合
**依存関係:** タスクグループ2

- [x] 3.0 実行環境統合の完成
  - [x] 3.1 統合テストを2-8件作成
    - `run-workflow.js`で生成JSが正常に実行されることを検証
    - MCP `browser_run_code`で生成JSが実行可能であることを検証
    - プレースホルダー置換が正しく動作することを検証
  - [x] 3.2 `run-workflow.js`との互換性を確認
    - `eval`によるコード実行方式との互換性
    - `startFromStep`によるレジューム機能の動作確認
    - 結果オブジェクト形式（success, failedStep, completedSteps）の維持
  - [x] 3.3 MCP `browser_run_code`との互換性を確認
    - Playwright Page APIの使用確認
    - `__INPUT_DATA__`と`__CURRENT_FILE__`プレースホルダーの動作確認
  - [x] 3.4 既存ワークフローの移行
    - `workflows/amazon-product-search.yaml`を新スキーマ形式に更新
    - `fallback.mode`を削除、`hint`をステップ直下に移動
    - 変換スクリプトで新JSテンプレートを生成
  - [x] 3.5 統合テストの実行
    - タスク3.1で作成したテストのみ実行
    - 全テストがパスすることを確認

**受け入れ基準:**
- タスク3.1で作成した2-8件のテストがパス
- 生成JSが両実行環境で正常動作
- 既存ワークフローが新形式に移行済み

---

### ドキュメント・品質保証レイヤー

#### タスクグループ4: テストレビューとギャップ分析
**依存関係:** タスクグループ1-3

- [x] 4.0 テストレビューと重要なギャップの補填
  - [x] 4.1 タスクグループ1-3のテストをレビュー
    - スキーマ検証テスト（タスク1.1）のレビュー
    - 変換スクリプトテスト（タスク2.1）のレビュー
    - 統合テスト（タスク3.1）のレビュー
    - 既存テスト数: 約6-24件
  - [x] 4.2 このフィーチャーに関するテストカバレッジのギャップを分析
    - 重要なユーザーワークフローでカバレッジが不足している箇所を特定
    - 本スペックの機能要件に関連するギャップのみに焦点
    - エンドツーエンドワークフローを優先
  - [x] 4.3 最大10件の追加テストを作成（必要に応じて）
    - 統合ポイントとエンドツーエンドワークフローに焦点
    - エッジケース、パフォーマンステストは対象外
    - ビジネスクリティカルでない場合はスキップ
  - [x] 4.4 フィーチャー固有のテストのみ実行
    - 本スペックに関連するテストのみ実行（1.1, 2.1, 3.1, 4.3）
    - 合計: 約16-34件のテスト
    - アプリケーション全体のテストスイートは実行しない

**受け入れ基準:**
- フィーチャー固有のテストが全てパス（約16-34件）
- 重要なユーザーワークフローがカバーされている
- 追加テストは最大10件
- 本スペックの機能要件に焦点

---

## 実行順序

推奨実装順序:
1. スキーマ定義レイヤー（タスクグループ1）
2. 変換スクリプトレイヤー（タスクグループ2）
3. 統合レイヤー（タスクグループ3）
4. テストレビューとギャップ分析（タスクグループ4）

## 依存関係図

```
[タスクグループ1: スキーマ定義]
          |
          v
[タスクグループ2: 変換スクリプト]
          |
          v
[タスクグループ3: 実行環境統合]
          |
          v
[タスクグループ4: テストレビュー]
```

## 主要ファイル一覧

| ファイル | 説明 |
|---------|------|
| `schemas/workflow.schema.json` | YAMLワークフローのJSON Schemaスキーマ |
| `scripts/yaml-to-js.js` | 決定論的変換スクリプト |
| `generated/<workflow>.template.js` | 生成されるJSテンプレート |
| `workflows/<workflow>.yaml` | ワークフロー定義YAML（新形式） |

## 参照すべき既存コード

- `workflows/amazon-product-search.yaml`: 現在のYAML構造（移行元）
- `generated/amazon-product-search.template.js`: 現在のJS構造（出力形式の参考）
- `run-workflow.js`: 実行ロジック（互換性維持対象）
