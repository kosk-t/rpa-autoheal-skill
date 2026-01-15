---
name: rpa-explore
description: "ブラウザ自動化の探索モード。「探索モードで構築」「ワークフローを作成」「YAMLを改善」「修正して」と言われたら使用。"
---

# RPA 探索モード

対話的にブラウザを操作しながら、ワークフローYAMLを構築・改善する。

---

## フロー

1. **記録**: ユーザー指示に従いブラウザ操作 → YAML出力 → JS生成
2. **テスト**: `/rpa-execute` で実行 → 改善レポート確認
3. **改善**: 改善レポートを基にYAML修正 → JS再生成 → 再テスト

---

## フェーズ1: 記録

### 手順

1. `browser_navigate` でURLにアクセス
2. `browser_snapshot` でページ構造を取得
3. ユーザー指示に従い操作を実行、ステップを記録
4. 完了キーワード（「ここまで」「保存」等）でYAML出力
5. **即座に `node scripts/yaml-to-js.js` でスキーマチェック + JS生成**

### YAML出力後

```bash
node scripts/yaml-to-js.js workflows/<name>.yaml
```

- 成功 → 「テストしますか？」
- 失敗 → エラー内容を確認しYAML修正、再実行

---

## フェーズ2: テスト

**`/rpa-execute` で実行。探索モードで直接テストしない。**

「テストして」→ Skill tool で `/rpa-execute` を呼び出す。

---

## フェーズ3: 改善

改善レポートを基にYAMLを修正。

### 手順

1. `improvements/<workflow名>/` から過去の改善レポートを確認
2. 改善点を特定、diff形式で提案
3. 承認後YAML更新
4. **`node scripts/yaml-to-js.js` でJS再生成**
5. 再テスト

### 問題と対応

| 問題 | 対応 |
|------|------|
| セレクタが見つからない | 代替セレクタを探して更新 |
| タイミングの問題 | wait ステップを追加 |
| 条件によって処理が異なる | when 条件を追加 |
| 繰り返し処理が必要 | playwright_code に変換 |
| fill で visible 判定失敗 | type アクションに変更 |

**アクション詳細**: `rpa-docs/actions.md`

---

## セレクタの特定

**重要: 高速実行で使えるCSSセレクタを取得する。**

1. `browser_snapshot` で要素を特定（ref番号）
2. `browser_evaluate` でDOMからセレクタ取得

→ 詳細・コード例: `references/selectors.md`

### セレクタ優先順位

1. `#element-id` - ID
2. `[aria-label*='Label']` - aria-label部分一致
3. `[data-testid='...']` - テスト用ID
4. `[name='fieldName']` - name属性

### 使用禁止

MCP専用のアクセシビリティロール（`browser_run_code` で動作しない）：
```
combobox[name='...'], textbox[name='...'], gridcell:has-text('...')
```

---

## 条件分岐（when）

```yaml
# 単一条件
- name: 高額時のみ追加入力
  action: fill
  selector: "input[name='extra']"
  value: "追加情報"
  when:
    field: extract.amount
    op: ">"
    value: 10000

# 複数条件
- name: 複合条件
  action: click
  selector: "#special-button"
  when:
    conditions:
      - field: extract.amount
        op: ">"
        value: 10000
      - field: input.type
        op: "=="
        value: "external"
    match: all  # all | any
```

演算子: `==`, `!=`, `>`, `<`, `>=`, `<=`
参照可能: `extract.*`, `input.*`, `constants.*`

---

## 複雑な操作（playwright_code）

ループ処理や複雑な条件分岐が必要な場合：

```yaml
- name: 平日のWorking Hoursを入力
  action: playwright_code
  code: |
    const weekdays = ['Mon', 'Tue', 'Wed'];
    for (const day of weekdays) {
      const row = page.getByRole('row', { name: new RegExp(day) }).first();
      await row.getByLabel('Work Start Time hours').selectOption('09');
    }
  hint: "Working Hoursダイアログ内で時間を入力"
```

利用可能: `page`, `extract`, `input`, `constants`

---

## ログイン待機

認証が必要なサイトでは待機ポイントを記録：

```yaml
- name: ログイン完了を待機
  action: wait
  selector: "#dashboard"
  timeout: 120000
  hint: "ログイン後のダッシュボード"
```

---

## 参照

- YAML構造: `references/workflow-template.yaml`
- セレクタ形式: `rpa-docs/selectors.md`
- セレクタ取得コード: `references/selectors.md`
- アクション一覧: `rpa-docs/actions.md`
