# セレクタ形式

## 優先順位

1. `#element-id` - ID（最も安定）
2. `[id='element id']` - スペースや特殊文字を含むID
3. `[aria-label*='Label']` - aria-label部分一致
4. `[data-testid='...']` - テスト用ID
5. `[name='fieldName']` - name属性
6. `input[type='text']` - タグ + 属性
7. `li:has-text('Option')` - Playwright拡張

## 使用禁止

MCP専用のアクセシビリティロール（`run-code` で動作しない）：

```
combobox[name='...']
textbox[name='...']
gridcell:has-text('...')
```

## 詳細

セレクタ取得のコード例 → `.claude/skills/rpa-explore/references/selectors.md`
