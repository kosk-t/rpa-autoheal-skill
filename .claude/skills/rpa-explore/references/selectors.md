# セレクタ取得ガイド

高速実行（`playwright-cli run-code`）で使えるCSSセレクタを取得する。

---

## 取得手順

1. `playwright-cli snapshot` で要素を特定（ref番号を取得）
2. `playwright-cli eval` でDOMからCSSセレクタを取得

---

## 単一要素のセレクタ取得

```bash
# playwright-cli eval で ref を指定して実際のセレクタを取得
playwright-cli eval "(element) => { ... }" e45
```

```javascript
// 関数の中身
(element) => {
  // IDがあればそれを使用（スペースや特殊文字がある場合は属性形式）
  if (element.id) {
    if (/[\s\/]/.test(element.id)) {
      return `[id='${element.id}']`;  // スペースや/を含むID
    }
    return `#${element.id}`;
  }

  // aria-labelがあれば使用（動的IDの代替として有効）
  const ariaLabel = element.getAttribute('aria-label');
  if (ariaLabel) {
    // 部分一致で安定性を確保
    const key = ariaLabel.split(':')[0];  // "Reason: Select" → "Reason"
    return `[aria-label*='${key}']`;
  }

  // data-testidがあればそれを使用
  if (element.dataset?.testid) {
    return `[data-testid="${element.dataset.testid}"]`;
  }

  // name属性があれば使用
  if (element.name) return `[name="${element.name}"]`;

  // クラス + タグで特定
  const tag = element.tagName.toLowerCase();
  const classes = Array.from(element.classList).join('.');
  return classes ? `${tag}.${classes}` : tag;
}
```

---

## 複数要素の一括取得

探索効率化のため、複数要素のセレクタを一度に取得：

```bash
# playwright-cli eval（ref指定なし、ページ全体で実行）
playwright-cli eval "() => { ... }"
```

```javascript
// 関数の中身
() => {
  const getSelector = (el) => {
    if (el.id) {
      return /[\s\/]/.test(el.id) ? `[id='${el.id}']` : `#${el.id}`;
    }
    const aria = el.getAttribute('aria-label');
    if (aria) return `[aria-label*='${aria.split(':')[0]}']`;
    if (el.name) return `[name="${el.name}"]`;
    return null;
  };

  // フォーム要素を収集
  const elements = document.querySelectorAll('input, select, button, [role="combobox"]');
  const results = {};
  elements.forEach((el, i) => {
    const sel = getSelector(el);
    if (sel) {
      const label = el.placeholder || el.textContent?.slice(0,30) || `element-${i}`;
      results[label] = sel;
    }
  });
  return results;
}
```

---

## セレクタ形式（優先順位）

高速実行（`playwright-cli run-code`）で動作する形式のみ使用：

1. `#element-id` - ID（最も安定）
2. `[id='element id']` - スペースや特殊文字を含むID
3. `[aria-label*='Label']` - aria-label部分一致（動的IDの代替）
4. `[data-testid='...']` - テスト用ID
5. `[name='fieldName']` - name属性
6. `input[type='text']` - タグ + 属性
7. `button.submit-btn` - タグ + クラス

---

## ドロップダウン選択

`:has-text()` を使用（Playwright拡張、`run-code`で動作）：

```yaml
- action: click
  selector: "#expense-dropdown"

- action: click
  selector: "li:has-text('Meals and Entertainment')"
```

---

## 使用禁止（高速実行で動作しない）

以下はPlaywright MCP専用のアクセシビリティロールで、`run-code` では動作しない：

```yaml
# NG - MCP専用形式
selector: "combobox[name='Select a Value']"
selector: "gridcell:has-text('Cell Text')"
selector: "textbox[name='Amount']"

# OK - 純粋なCSSセレクタ + Playwright拡張
selector: "#expense-dropdown"
selector: "[aria-label*='Reason']"
selector: "li:has-text('Option Text')"
```
