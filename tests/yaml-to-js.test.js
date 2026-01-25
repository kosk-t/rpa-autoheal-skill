/**
 * YAML to JS Conversion Tests
 *
 * Tests for deterministic YAML to JS conversion.
 * These tests verify:
 * - Basic YAML to JS conversion accuracy
 * - Determinism: same input always produces same output
 * - `when` clause conversion to JS if statements
 * - `playwright_code` blocks are copied verbatim
 */

const fs = require('fs');
const path = require('path');
const { convertYamlToJs, parseYamlWorkflow, validateWorkflow } = require('../scripts/yaml-to-js');

const SCHEMA_PATH = path.join(__dirname, '..', 'schemas', 'workflow.schema.json');

describe('YAML to JS Conversion', () => {

  // Test 1: Basic YAML to JS conversion accuracy
  test('should convert basic workflow YAML to valid JS template', () => {
    const workflow = {
      name: 'test-workflow',
      description: 'A test workflow',
      steps: [
        {
          name: 'Navigate to site',
          action: 'navigate',
          url: 'https://example.com'
        },
        {
          name: 'Fill search box',
          action: 'fill',
          selector: '#search',
          value: '${input.keyword}',
          hint: 'Search input field'
        },
        {
          name: 'Click submit',
          action: 'click',
          selector: '#submit'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Verify generated code contains expected elements
    expect(jsCode).toContain('async (page)');
    expect(jsCode).toContain('__INPUT_DATA__');
    expect(jsCode).toContain("page.goto('https://example.com')");
    expect(jsCode).toContain("page.fill('#search'");
    expect(jsCode).toContain("page.click('#submit')");
    expect(jsCode).toContain("name: 'Navigate to site'");
    expect(jsCode).toContain("name: 'Fill search box'");
    expect(jsCode).toContain("hint: 'Search input field'");
  });

  // Test 2: Determinism - same input always produces same output
  test('should produce identical output for identical input (determinism)', () => {
    const workflow = {
      name: 'determinism-test',
      steps: [
        {
          name: 'Step 1',
          action: 'navigate',
          url: 'https://example.com'
        },
        {
          name: 'Step 2',
          action: 'click',
          selector: '#button'
        }
      ]
    };

    // Run conversion multiple times
    const result1 = convertYamlToJs(workflow);
    const result2 = convertYamlToJs(workflow);
    const result3 = convertYamlToJs(workflow);

    // All outputs should be identical
    expect(result1).toBe(result2);
    expect(result2).toBe(result3);
  });

  // Test 3: `when` clause conversion to JS if statement (single condition)
  test('should convert single when clause to JS if statement', () => {
    const workflow = {
      name: 'when-test',
      steps: [
        {
          name: 'Conditional click',
          action: 'click',
          selector: '#premium-button',
          when: {
            field: 'extract.amount',
            op: '>',
            value: 10000
          }
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Verify if statement is generated
    expect(jsCode).toContain('if (extract.amount > 10000)');
  });

  // Test 4: `when` clause with multiple conditions (AND)
  test('should convert multiple when conditions with match:all to AND', () => {
    const workflow = {
      name: 'multi-when-test',
      steps: [
        {
          name: 'Conditional action',
          action: 'click',
          selector: '#special-button',
          when: {
            conditions: [
              { field: 'extract.amount', op: '>=', value: 5000 },
              { field: 'input.isPremium', op: '==', value: true }
            ],
            match: 'all'
          }
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Verify AND condition
    expect(jsCode).toContain('extract.amount >= 5000');
    expect(jsCode).toContain('input.isPremium === true');
    expect(jsCode).toContain('&&');
  });

  // Test 5: `when` clause with multiple conditions (OR)
  test('should convert multiple when conditions with match:any to OR', () => {
    const workflow = {
      name: 'or-when-test',
      steps: [
        {
          name: 'Conditional action',
          action: 'click',
          selector: '#alert-button',
          when: {
            conditions: [
              { field: 'extract.status', op: '==', value: 'error' },
              { field: 'extract.status', op: '==', value: 'warning' }
            ],
            match: 'any'
          }
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Verify OR condition
    expect(jsCode).toContain("extract.status === 'error'");
    expect(jsCode).toContain("extract.status === 'warning'");
    expect(jsCode).toContain('||');
  });

  // Test 6: `playwright_code` blocks are copied verbatim
  test('should copy playwright_code blocks verbatim', () => {
    const customCode = `const items = await page.$$('.item');
for (const item of items) {
  const text = await item.textContent();
  console.log(text);
}
return items.length;`;

    const workflow = {
      name: 'playwright-code-test',
      steps: [
        {
          name: 'Execute custom code',
          action: 'playwright_code',
          code: customCode,
          output: 'itemCount'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Verify code is copied exactly
    expect(jsCode).toContain("const items = await page.$$('.item')");
    expect(jsCode).toContain('for (const item of items)');
    expect(jsCode).toContain('return items.length;');
    expect(jsCode).toContain("output: 'itemCount'");
  });

  // Test 7: All action types are correctly converted
  test('should convert all action types correctly', () => {
    const workflow = {
      name: 'all-actions-test',
      steps: [
        {
          name: 'Navigate',
          action: 'navigate',
          url: 'https://example.com'
        },
        {
          name: 'Fill',
          action: 'fill',
          selector: '#input',
          value: 'test value'
        },
        {
          name: 'Click',
          action: 'click',
          selector: '#button'
        },
        {
          name: 'Press',
          action: 'press',
          selector: '#input',
          key: 'Enter'
        },
        {
          name: 'Wait',
          action: 'wait',
          selector: '.loaded',
          timeout: 5000
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    expect(jsCode).toContain("page.goto('https://example.com')");
    expect(jsCode).toContain('waitForLoadState');
    expect(jsCode).toContain("page.fill('#input'");
    expect(jsCode).toContain("page.click('#button')");
    expect(jsCode).toContain("page.press('#input', 'Enter')");
    expect(jsCode).toContain("page.waitForSelector('.loaded'");
    expect(jsCode).toContain('timeout: 5000');
  });

  // Test 8: Variable interpolation conversion
  test('should convert variable interpolation correctly', () => {
    const workflow = {
      name: 'interpolation-test',
      constants: {
        baseUrl: 'https://example.com'
      },
      steps: [
        {
          name: 'Fill with input',
          action: 'fill',
          selector: '#search',
          value: '${input.keyword}'
        },
        {
          name: 'Fill with extract',
          action: 'fill',
          selector: '#amount',
          value: '${extract.total}'
        },
        {
          name: 'Fill with constant',
          action: 'fill',
          selector: '#url',
          value: '${constants.baseUrl}'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Verify template literal conversion
    expect(jsCode).toContain('input.keyword');
    expect(jsCode).toContain('extract.total');
    expect(jsCode).toContain('constants.baseUrl');
  });
});

describe('Schema Validation in Conversion', () => {

  // Test for schema validation error messages
  test('should return clear error message for invalid workflow', () => {
    const invalidWorkflow = {
      // Missing required 'name' field
      steps: [
        {
          name: 'Step 1',
          action: 'invalid_action',
          url: 'https://example.com'
        }
      ]
    };

    const result = validateWorkflow(invalidWorkflow);

    expect(result.valid).toBe(false);
    expect(result.errors).toBeDefined();
    expect(result.errors.length).toBeGreaterThan(0);
  });
});
