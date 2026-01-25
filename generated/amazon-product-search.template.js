// amazon-product-search - Auto-generated template
// Generated from: workflows/amazon-product-search.yaml
// Amazonで商品を検索し、価格・評価情報を取得
//
// ============================================================
// AI EXECUTION POLICY (この指示に必ず従うこと)
// ============================================================
// 1. このコードを browser_run_code で一括実行する
// 2. 失敗時 (failedStep != null):
//    a. browser_snapshot で現在の状態を確認
//    b. MCP (browser_click等) で失敗したステップのみを実行
//    c. 成功したら startFromStep = failedStep.index + 1 で
//       このコードを再度 browser_run_code で実行（残りを継続）
// 3. 重要: MCPフォールバック後は必ずスクリプト実行に戻る
//    MCPで1ステップずつ進めるのは禁止（トークン浪費）
// ============================================================

async (page) => {
  const inputData = __INPUT_DATA__;
  const { extract = {}, input = {}, startFromStep = 0 } = inputData;

  const constants = {"max_results":3};

  const steps = [
    // Step 0: Amazonにアクセス
    {
      name: 'Amazonにアクセス',
      action: 'navigate',
      execute: async () => {
        await page.goto('https://www.amazon.co.jp');
        await page.waitForLoadState('domcontentloaded');
      },
      hint: 'Amazon Japan トップページ'
    },

    // Step 1: 検索キーワードを入力
    {
      name: '検索キーワードを入力',
      action: 'fill',
      selector: '#twotabsearchtextbox',
      execute: async () => {
        await page.fill('#twotabsearchtextbox', input.keyword);
      },
      hint: 'Amazon検索ボックス'
    },

    // Step 2: 検索を実行
    {
      name: '検索を実行',
      action: 'press',
      selector: '#twotabsearchtextbox',
      execute: async () => {
        await page.press('#twotabsearchtextbox', 'Enter');
      },
    },

    // Step 3: 検索結果を待機
    {
      name: '検索結果を待機',
      action: 'wait',
      selector: '[data-component-type=\'s-search-result\']',
      execute: async () => {
        await page.waitForSelector('[data-component-type=\'s-search-result\']', { timeout: 10000 });
      },
    },

    // Step 4: 商品情報を抽出
    {
      name: '商品情報を抽出',
      action: 'playwright_code',
      execute: async () => {
        const products = [];
        const items = await page.$$('[data-component-type="s-search-result"]');
        
        for (let i = 0; i < Math.min(items.length, constants.max_results); i++) {
          const item = items[i];
        
          // 各要素から情報を抽出
          const priceEl = await item.$('.a-price .a-offscreen');
          const ratingEl = await item.$('[aria-label*="5つ星"]');
          const asin = await item.getAttribute('data-asin');
        
          const price = priceEl ? await priceEl.textContent() : null;
          const rating = ratingEl ? await ratingEl.getAttribute('aria-label') : null;
        
          if (asin && price) {
            products.push({
              asin: asin,
              price: price,
              rating: rating ? rating.slice(0, 15) : '評価なし',
              url: `https://www.amazon.co.jp/dp/${asin}`
            });
          }
        }
        
        return products;
        
      },
      output: 'products',
      hint: '検索結果一覧から商品のASIN、価格、評価を取得'
    }

  ];

  const MAX_RETRIES = 3;
  const RETRY_DELAY = 1000;

  async function executeWithRetry(step, stepIndex) {
    let lastError;
    for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
      try {
        if (attempt > 1) {
          console.log(`Step ${stepIndex}: ${step.name} - Retry ${attempt}/${MAX_RETRIES}...`);
          await new Promise(r => setTimeout(r, RETRY_DELAY));
        } else {
          console.log(`Step ${stepIndex}: ${step.name}...`);
        }
        return await step.execute();
      } catch (error) {
        lastError = error;
        console.log(`Step ${stepIndex}: ${step.name} - Attempt ${attempt} failed: ${error.message}`);
        if (attempt === MAX_RETRIES) {
          throw lastError;
        }
      }
    }
  }

  // Results object and execution loop
  const results = { success: true, completedSteps: [], failedStep: null, output: {} };

  for (let i = startFromStep; i < steps.length; i++) {
    const step = steps[i];
    try {
      const stepResult = await executeWithRetry(step, i);
      results.completedSteps.push({ index: i, name: step.name, success: true });

      if (step.output && stepResult !== undefined) {
        results.output[step.output] = stepResult;
      }
    } catch (error) {
      results.success = false;
      // フォールバック情報: MCPで対処後 startFromStep = index + 1 で再実行
      results.failedStep = {
        index: i,
        name: step.name,
        selector: step.selector,
        hint: step.hint,
        error: error.message,
        retriesExhausted: true
      };
      break;
    }
  }

  return results;
}