# アクション定義

YAMLで使用可能なアクションの定義。

---

## アクション一覧

| action | Playwright コード | セレクタ | 用途 |
|--------|------------------|---------|------|
| `navigate` | `page.goto(url)` | - | URL遷移 |
| `wait` | `page.waitForSelector(selector, { timeout })` | 必須 | 要素出現待機 |
| `click` | `page.click(selector)` | 必須 | クリック |
| `fill` | `page.fill(selector, value)` | 必須 | テキスト入力（actionabilityチェックあり） |
| `press` | `page.press(selector, key)` | 必須 | キー押下（Enter, Tab等） |
| `type` | `page.keyboard.type(value)` | 不要 | キーボード入力（フォーカス位置に入力） |
| `select` | `page.selectOption(selector, value)` | 必須 | ドロップダウン選択 |
| `file_upload` | `page.setInputFiles(selector, path)` | 必須 | ファイルアップロード |
| `playwright_code` | コードをそのまま埋め込む | - | 複雑な操作 |

---

## 各アクションの詳細

### navigate

```yaml
- name: ページを開く
  action: navigate
  url: https://example.com
```

### wait

```yaml
- name: 要素の出現を待機
  action: wait
  selector: "#main-content"
  timeout: 5000  # タイムアウト（ms）、デフォルト30000
```

**ログイン待機の場合:**
```yaml
- name: ログイン完了を待機
  action: wait
  selector: "#user-menu"
  timeout: 120000
  hint: "ログインしてください"
```

### click

```yaml
- name: ボタンをクリック
  action: click
  selector: "#submit-btn"
  hint: "送信ボタン"
```

### fill

```yaml
- name: テキストを入力
  action: fill
  selector: "input[name='email']"
  value: "${extract.email}"
  hint: "メールアドレス入力欄"
```

### press

```yaml
- name: Enterキーを押す
  action: press
  selector: "#search-box"
  key: "Enter"
```

**使用可能なキー:** `Enter`, `Tab`, `Escape`, `ArrowDown`, `ArrowUp` など

### type

セレクタ不要。直前の `click` でフォーカスを当ててから使用。

```yaml
- name: 検索ボックスに入力
  action: type
  value: "${extract.search_term}"
  hint: "ドロップダウンが開いた状態でキーボード入力"
```

**fill との違い:**
- `fill`: 要素をクリア → 値セット（actionabilityチェックあり）
- `type`: フォーカス位置に1文字ずつ入力（チェックなし）

**用途:** `fill` で visible 判定に失敗する場合（ドロップダウン内検索ボックス等）

### select

```yaml
- name: 国を選択
  action: select
  selector: "select[name='country']"
  value: "JP"
```

### file_upload

```yaml
- name: ファイルをアップロード
  action: file_upload
  selector: "input[type='file']"
  file: "${input.file_path}"
```

### playwright_code

複雑なループ・条件分岐が必要な場合:

```yaml
- name: 複数行を処理
  action: playwright_code
  code: |
    for (const item of extract.items) {
      await page.fill('#input', item);
      await page.click('#add');
    }
  output: result_variable
  hint: "テーブルに行を追加"
```

**利用可能な変数:**
- `page` - Playwright Page オブジェクト
- `extract` - 抽出データ
- `input` - 入力パラメータ
- `constants` - YAML定義の定数

---

## 変数補間

値に変数を埋め込む場合は `${...}` 形式を使用:

```yaml
- name: キーワードを入力
  action: fill
  selector: "#search"
  value: "${input.keyword}"
```

**参照可能な変数:**
- `extract.*` - OCR等で抽出したデータ
- `input.*` - ユーザー入力パラメータ
- `constants.*` - YAML定義の定数

---

## 条件分岐（when）

特定条件でのみステップを実行:

### 単一条件

```yaml
- name: 高額時のみ実行
  action: fill
  selector: "#extra"
  value: "追加情報"
  when:
    field: extract.amount
    op: ">"
    value: 10000
```

### 複数条件

```yaml
- name: 複合条件
  action: click
  selector: "#special"
  when:
    conditions:
      - field: extract.amount
        op: ">"
        value: 10000
      - field: input.type
        op: "=="
        value: "external"
    match: all  # all（AND） | any（OR）
```

**使用可能な演算子:** `==`, `!=`, `>`, `<`, `>=`, `<=`
