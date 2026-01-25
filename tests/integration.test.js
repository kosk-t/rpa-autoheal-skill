/**
 * Integration Tests for YAML to JS Conversion
 *
 * Tests for execution environment integration:
 * - run-workflow.js compatibility (eval execution, startFromStep, result format)
 * - MCP browser_run_code compatibility (Playwright Page API, placeholders)
 * - Placeholder replacement functionality
 */

const { convertYamlToJs } = require('../scripts/yaml-to-js');
const { createMockPage } = require('./helpers/mock-page');

describe('run-workflow.js Compatibility', () => {

  // Test 1: Generated JS can be executed with eval
  test('generated JS should be executable via eval', async () => {
    const workflow = {
      name: 'eval-test',
      description: 'Test eval execution',
      steps: [
        {
          name: 'Navigate to site',
          action: 'navigate',
          url: 'https://example.com'
        },
        {
          name: 'Click button',
          action: 'click',
          selector: '#button'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Replace placeholder with actual input data
    const inputData = {
      extract: {},
      constants: {},
      input: {},
      startFromStep: 0
    };

    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));

    // Execute via eval (same as run-workflow.js)
    const workflowFn = eval(`(${code})`);
    expect(typeof workflowFn).toBe('function');

    // Execute with mock page
    const mockPage = createMockPage();
    const result = await workflowFn(mockPage);

    // Verify result structure
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('completedSteps');
    expect(result).toHaveProperty('failedStep');
    expect(result).toHaveProperty('output');
  });

  // Test 2: startFromStep resume functionality
  test('startFromStep should skip initial steps correctly', async () => {
    const workflow = {
      name: 'resume-test',
      steps: [
        {
          name: 'Step 0',
          action: 'navigate',
          url: 'https://step0.com'
        },
        {
          name: 'Step 1',
          action: 'navigate',
          url: 'https://step1.com'
        },
        {
          name: 'Step 2',
          action: 'click',
          selector: '#button2'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Start from step 1 (skip step 0)
    const inputData = {
      extract: {},
      constants: {},
      input: {},
      startFromStep: 1
    };

    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));
    const workflowFn = eval(`(${code})`);
    const mockPage = createMockPage();

    const result = await workflowFn(mockPage);

    // Verify step 0 was skipped
    expect(result.completedSteps.length).toBe(2);
    expect(result.completedSteps[0].name).toBe('Step 1');
    expect(result.completedSteps[1].name).toBe('Step 2');

    // Verify page methods were called correctly
    expect(mockPage.calls[0]).toEqual({ method: 'goto', args: ['https://step1.com'] });
  });

  // Test 3: Result object format (success, failedStep, completedSteps)
  test('result object should have correct format on success', async () => {
    const workflow = {
      name: 'result-format-test',
      steps: [
        {
          name: 'Navigate',
          action: 'navigate',
          url: 'https://example.com'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);
    const inputData = { extract: {}, constants: {}, input: {}, startFromStep: 0 };
    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));
    const workflowFn = eval(`(${code})`);
    const mockPage = createMockPage();

    const result = await workflowFn(mockPage);

    expect(result.success).toBe(true);
    expect(result.failedStep).toBeNull();
    expect(Array.isArray(result.completedSteps)).toBe(true);
    expect(result.completedSteps[0]).toEqual({
      index: 0,
      name: 'Navigate',
      success: true
    });
    expect(typeof result.output).toBe('object');
  });

  // Test 4: Result object format on failure (with failedStep details)
  test('result object should capture failure details correctly', async () => {
    const workflow = {
      name: 'failure-test',
      steps: [
        {
          name: 'Navigate',
          action: 'navigate',
          url: 'https://example.com'
        },
        {
          name: 'Click missing button',
          action: 'click',
          selector: '#missing-button',
          hint: 'Submit button'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);
    const inputData = { extract: {}, constants: {}, input: {}, startFromStep: 0 };
    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));
    const workflowFn = eval(`(${code})`);

    // Create mock page that throws on second step
    const mockPage = createMockPage();
    mockPage.click = async () => {
      throw new Error('Element not found');
    };

    const result = await workflowFn(mockPage);

    expect(result.success).toBe(false);
    expect(result.failedStep).toBeDefined();
    expect(result.failedStep.index).toBe(1);
    expect(result.failedStep.name).toBe('Click missing button');
    expect(result.failedStep.selector).toBe('#missing-button');
    expect(result.failedStep.hint).toBe('Submit button');
    expect(result.failedStep.error).toBe('Element not found');
  });
});

describe('MCP browser_run_code Compatibility', () => {

  // Test 5: Playwright Page API usage
  test('generated JS should use Playwright Page API correctly', async () => {
    const workflow = {
      name: 'playwright-api-test',
      steps: [
        {
          name: 'Navigate',
          action: 'navigate',
          url: 'https://example.com'
        },
        {
          name: 'Fill form',
          action: 'fill',
          selector: '#email',
          value: 'test@example.com'
        },
        {
          name: 'Press Enter',
          action: 'press',
          selector: '#email',
          key: 'Enter'
        },
        {
          name: 'Wait for result',
          action: 'wait',
          selector: '.result',
          timeout: 5000
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);
    const inputData = { extract: {}, constants: {}, input: {}, startFromStep: 0 };
    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));
    const workflowFn = eval(`(${code})`);
    const mockPage = createMockPage();

    await workflowFn(mockPage);

    // Verify Playwright API methods were called
    expect(mockPage.calls).toContainEqual({ method: 'goto', args: ['https://example.com'] });
    expect(mockPage.calls).toContainEqual({ method: 'waitForLoadState', args: ['domcontentloaded'] });
    expect(mockPage.calls).toContainEqual({ method: 'fill', args: ['#email', 'test@example.com'] });
    expect(mockPage.calls).toContainEqual({ method: 'press', args: ['#email', 'Enter'] });
    expect(mockPage.calls).toContainEqual({ method: 'waitForSelector', args: ['.result', { timeout: 5000 }] });
  });

  // Test 6: __INPUT_DATA__ placeholder replacement
  test('__INPUT_DATA__ placeholder should be replaceable with JSON', async () => {
    const workflow = {
      name: 'placeholder-test',
      steps: [
        {
          name: 'Fill with input',
          action: 'fill',
          selector: '#search',
          value: '${input.keyword}'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Verify placeholder exists
    expect(jsCode).toContain('__INPUT_DATA__');

    // Replace with actual data
    const inputData = {
      extract: {},
      constants: {},
      input: { keyword: 'test search' },
      startFromStep: 0
    };

    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));

    // Verify replacement worked
    expect(code).not.toContain('__INPUT_DATA__');
    expect(code).toContain('"keyword":"test search"');

    // Execute and verify
    const workflowFn = eval(`(${code})`);
    const mockPage = createMockPage();
    await workflowFn(mockPage);

    expect(mockPage.calls).toContainEqual({
      method: 'fill',
      args: ['#search', 'test search']
    });
  });
});

describe('Placeholder Replacement', () => {

  // Test 7: Variable interpolation works correctly with actual values
  test('variable interpolation should work with extract, input, and constants', async () => {
    const workflow = {
      name: 'interpolation-integration-test',
      steps: [
        {
          name: 'Fill with extract value',
          action: 'fill',
          selector: '#amount',
          value: '${extract.totalAmount}'
        },
        {
          name: 'Fill with input value',
          action: 'fill',
          selector: '#name',
          value: '${input.userName}'
        },
        {
          name: 'Fill with constant',
          action: 'fill',
          selector: '#code',
          value: '${constants.defaultCode}'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);
    const inputData = {
      extract: { totalAmount: '5000' },
      constants: { defaultCode: 'ABC123' },
      input: { userName: 'John' },
      startFromStep: 0
    };

    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));
    const workflowFn = eval(`(${code})`);
    const mockPage = createMockPage();

    await workflowFn(mockPage);

    expect(mockPage.calls).toContainEqual({
      method: 'fill',
      args: ['#amount', '5000']
    });
    expect(mockPage.calls).toContainEqual({
      method: 'fill',
      args: ['#name', 'John']
    });
    expect(mockPage.calls).toContainEqual({
      method: 'fill',
      args: ['#code', 'ABC123']
    });
  });

  // Test 8: playwright_code blocks with output
  test('playwright_code output should be captured in results', async () => {
    const workflow = {
      name: 'output-test',
      steps: [
        {
          name: 'Extract data',
          action: 'playwright_code',
          code: 'return { count: 42, items: ["a", "b", "c"] };',
          output: 'extractedData'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);
    const inputData = { extract: {}, constants: {}, input: {}, startFromStep: 0 };
    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));
    const workflowFn = eval(`(${code})`);
    const mockPage = createMockPage();

    const result = await workflowFn(mockPage);

    expect(result.success).toBe(true);
    expect(result.output).toHaveProperty('extractedData');
    expect(result.output.extractedData).toEqual({ count: 42, items: ['a', 'b', 'c'] });
  });
});
