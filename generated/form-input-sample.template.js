// form-input-sample - Auto-generated template
// Generated from: workflows/form-input-sample.yaml
// DemoQAの学生登録フォームに自動入力するサンプル
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

  const constants = {};

  const steps = [
    // Step 0: フォームページを開く
    {
      name: 'フォームページを開く',
      action: 'navigate',
      execute: async () => {
        await page.goto('https://demoqa.com/automation-practice-form');
        await page.waitForLoadState('domcontentloaded');
      },
    },

    // Step 1: 名を入力
    {
      name: '名を入力',
      action: 'fill',
      selector: '#firstName',
      execute: async () => {
        await page.fill('#firstName', input.first_name);
      },
      hint: 'First Name入力欄'
    },

    // Step 2: 姓を入力
    {
      name: '姓を入力',
      action: 'fill',
      selector: '#lastName',
      execute: async () => {
        await page.fill('#lastName', input.last_name);
      },
      hint: 'Last Name入力欄'
    },

    // Step 3: メールを入力
    {
      name: 'メールを入力',
      action: 'fill',
      selector: '#userEmail',
      execute: async () => {
        await page.fill('#userEmail', input.email);
      },
      hint: 'Email入力欄'
    },

    // Step 4: 性別を選択
    {
      name: '性別を選択',
      action: 'click',
      selector: 'label[for=\'gender-radio-1\']',
      execute: async () => {
        await page.click('label[for=\'gender-radio-1\']');
      },
      hint: 'Male ラジオボタン'
    },

    // Step 5: 電話番号を入力
    {
      name: '電話番号を入力',
      action: 'fill',
      selector: '#userNumber',
      execute: async () => {
        await page.fill('#userNumber', input.mobile);
      },
      hint: 'Mobile Number入力欄'
    },

    // Step 6: 生年月日を入力
    {
      name: '生年月日を入力',
      action: 'playwright_code',
      execute: async () => {
        if (input.birth_date !== '') {
          if (input.birth_date) {
            await page.locator('#dateOfBirthInput').click();
            await page.locator('#dateOfBirthInput').fill(input.birth_date);
            await page.keyboard.press('Escape');
          }
          
        }
      },
      hint: '日付ピッカーに生年月日を入力'
    },

    // Step 7: 科目を入力
    {
      name: '科目を入力',
      action: 'playwright_code',
      execute: async () => {
        if (input.subject !== '') {
          if (input.subject) {
            await page.locator('#subjectsInput').fill(input.subject);
            await page.locator('.subjects-auto-complete__option').first().click();
          }
          
        }
      },
      hint: 'Subjects入力欄にオートコンプリートで入力し、候補をクリック'
    },

    // Step 8: 趣味を選択
    {
      name: '趣味を選択',
      action: 'click',
      selector: 'label[for=\'hobbies-checkbox-1\']',
      execute: async () => {
        await page.click('label[for=\'hobbies-checkbox-1\']');
      },
      hint: 'Sports チェックボックス'
    },

    // Step 9: 画像をアップロード
    {
      name: '画像をアップロード',
      action: 'playwright_code',
      execute: async () => {
        if (input.picture !== '') {
          if (input.picture) {
            await page.locator('#uploadPicture').setInputFiles(input.picture);
          }
          
        }
      },
      hint: 'Picture入力欄にファイルをアップロード'
    },

    // Step 10: 住所を入力
    {
      name: '住所を入力',
      action: 'fill',
      selector: '#currentAddress',
      execute: async () => {
        if (input.address !== '') {
          await page.fill('#currentAddress', input.address);
        }
      },
      hint: 'Current Address入力欄'
    },

    // Step 11: 広告削除とスクロール
    {
      name: '広告削除とスクロール',
      action: 'playwright_code',
      execute: async () => {
        // 固定広告・フッター・オーバーレイを削除
        await page.evaluate(() => {
          const selectors = [
            '[id*="fixedban"]', '.fixedban', '[class*="Ad"]', '#adplus-anchor',
            'footer', '#footer', '.footer', '[id*="google_ads"]',
            '[style*="position: fixed"]', '[style*="position:fixed"]'
          ];
          selectors.forEach(sel => {
            document.querySelectorAll(sel).forEach(el => el.remove());
          });
        });
        await page.locator('#state').scrollIntoViewIfNeeded();
        await page.waitForTimeout(300);
        
      },
      hint: '広告・フッターを削除してState/Cityセレクタが見えるようにスクロール'
    },

    // Step 12: 州を選択
    {
      name: '州を選択',
      action: 'playwright_code',
      execute: async () => {
        if (input.state !== '') {
          if (input.state) {
            await page.locator('#state').click({ force: true });
            await page.locator('#state [class*="-menu"]').waitFor({ timeout: 3000 });
            await page.locator('#state').getByText(input.state, { exact: true }).click({ force: true });
          }
          
        }
      },
      hint: 'State ドロップダウンから選択'
    },

    // Step 13: 都市を選択
    {
      name: '都市を選択',
      action: 'playwright_code',
      execute: async () => {
        if (input.city !== '') {
          if (input.city) {
            await page.locator('#city').click({ force: true });
            await page.locator('#city [class*="-menu"]').waitFor({ timeout: 3000 });
            await page.locator('#city').getByText(input.city, { exact: true }).click({ force: true });
          }
          
        }
      },
      hint: 'City ドロップダウンから選択'
    },

    // Step 14: フォームを送信
    {
      name: 'フォームを送信',
      action: 'playwright_code',
      execute: async () => {
        await page.click('#submit', { force: true });
        
      },
      hint: 'Submit ボタン'
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