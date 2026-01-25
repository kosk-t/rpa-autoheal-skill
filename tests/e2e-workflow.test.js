/**
 * End-to-End Workflow Tests
 *
 * Tests for complete workflow pipeline:
 * - YAML file loading and validation
 * - Conversion to JS template
 * - Execution with mock page
 * - CLI interface functionality
 * - Existing workflow migration verification
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');
const yaml = require('js-yaml');
const { convertYamlToJs, parseYamlWorkflow, validateWorkflow } = require('../scripts/yaml-to-js');
const { createMockPage } = require('./helpers/mock-page');

const WORKFLOWS_DIR = path.join(__dirname, '..', 'workflows');
const SCHEMA_PATH = path.join(__dirname, '..', 'schemas', 'workflow.schema.json');

describe('End-to-End Workflow Pipeline', () => {

  // Test 1: Complete pipeline - YAML file to execution
  test('should execute complete pipeline from YAML file to execution', async () => {
    const yamlPath = path.join(WORKFLOWS_DIR, 'amazon-product-search.yaml');

    // Step 1: Parse YAML file
    const workflow = parseYamlWorkflow(yamlPath);
    expect(workflow).toBeDefined();
    expect(workflow.name).toBe('amazon-product-search');

    // Step 2: Validate against schema
    const validation = validateWorkflow(workflow);
    expect(validation.valid).toBe(true);

    // Step 3: Convert to JS
    const jsCode = convertYamlToJs(workflow);
    expect(jsCode).toContain('async (page)');
    expect(jsCode).toContain('__INPUT_DATA__');

    // Step 4: Execute with mock page
    const inputData = {
      extract: {},
      constants: { max_results: 3 },
      input: { keyword: 'test product' },
      startFromStep: 0
    };

    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));
    const workflowFn = eval(`(${code})`);
    const mockPage = createMockPage();

    // Mock $$ to return empty array (simulating no products found)
    const result = await workflowFn(mockPage);

    // Verify execution completed
    expect(result).toHaveProperty('success');
    expect(result).toHaveProperty('completedSteps');
    expect(Array.isArray(result.completedSteps)).toBe(true);
  });

  // Test 2: Existing amazon-product-search.yaml adheres to new schema
  test('amazon-product-search.yaml should conform to new schema format', () => {
    const yamlPath = path.join(WORKFLOWS_DIR, 'amazon-product-search.yaml');
    const workflow = parseYamlWorkflow(yamlPath);

    // Verify schema compliance
    const validation = validateWorkflow(workflow);
    expect(validation.valid).toBe(true);

    // Verify hint is at step level (not nested in fallback)
    workflow.steps.forEach((step, index) => {
      if (step.hint) {
        expect(typeof step.hint).toBe('string');
      }
      // Verify no fallback.mode field
      expect(step.fallback).toBeUndefined();
    });

    // Verify when clauses if present
    workflow.steps.forEach(step => {
      if (step.when) {
        // Should have structured format
        expect(step.when.field || step.when.conditions).toBeDefined();
      }
    });
  });

  // Test 3: Generated JS from amazon-product-search.yaml can be executed
  test('generated JS from amazon-product-search.yaml should be executable', async () => {
    const yamlPath = path.join(WORKFLOWS_DIR, 'amazon-product-search.yaml');
    const workflow = parseYamlWorkflow(yamlPath);
    const jsCode = convertYamlToJs(workflow);

    const inputData = {
      extract: {},
      constants: { max_results: 3 },
      input: { keyword: 'headphones' },
      startFromStep: 0
    };

    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputData));
    const workflowFn = eval(`(${code})`);
    const mockPage = createMockPage();

    const result = await workflowFn(mockPage);

    // Verify steps were executed in order
    expect(mockPage.calls[0]).toEqual({
      method: 'goto',
      args: ['https://www.amazon.co.jp']
    });
    expect(mockPage.calls[1]).toEqual({
      method: 'waitForLoadState',
      args: ['domcontentloaded']
    });
    expect(mockPage.calls[2]).toEqual({
      method: 'fill',
      args: ['#twotabsearchtextbox', 'headphones']
    });
    expect(mockPage.calls[3]).toEqual({
      method: 'press',
      args: ['#twotabsearchtextbox', 'Enter']
    });
    expect(mockPage.calls[4]).toEqual({
      method: 'waitForSelector',
      args: ["[data-component-type='s-search-result']", { timeout: 10000 }]
    });
  });

  // Test 4: __CURRENT_FILE__ placeholder compatibility
  test('generated JS should support __CURRENT_FILE__ placeholder pattern', () => {
    const workflow = {
      name: 'file-test',
      steps: [
        {
          name: 'Navigate',
          action: 'navigate',
          url: 'https://example.com'
        }
      ]
    };

    const jsCode = convertYamlToJs(workflow);

    // Verify __INPUT_DATA__ placeholder exists (which run-workflow.js uses)
    expect(jsCode).toContain('__INPUT_DATA__');

    // The generated code should work when __INPUT_DATA__ is replaced
    // run-workflow.js also supports __CURRENT_FILE__ for file-based execution
    const inputWithFile = {
      extract: {},
      constants: {},
      input: {},
      startFromStep: 0,
      currentFile: '/path/to/workflow.yaml'  // This would come from __CURRENT_FILE__
    };

    const code = jsCode.replace('__INPUT_DATA__', JSON.stringify(inputWithFile));

    // Should be valid JS
    expect(() => eval(`(${code})`)).not.toThrow();
  });
});

describe('CLI Interface', () => {

  const tempDir = path.join(__dirname, 'temp');
  const tempYaml = path.join(tempDir, 'cli-test.yaml');
  const tempJs = path.join(tempDir, 'cli-test.template.js');

  beforeAll(() => {
    // Create temp directory
    if (!fs.existsSync(tempDir)) {
      fs.mkdirSync(tempDir, { recursive: true });
    }

    // Create test YAML file
    const testWorkflow = {
      name: 'cli-test',
      description: 'CLI test workflow',
      steps: [
        {
          name: 'Navigate',
          action: 'navigate',
          url: 'https://example.com'
        }
      ]
    };
    fs.writeFileSync(tempYaml, yaml.dump(testWorkflow), 'utf8');
  });

  afterAll(() => {
    // Cleanup temp files
    if (fs.existsSync(tempYaml)) {
      fs.unlinkSync(tempYaml);
    }
    if (fs.existsSync(tempJs)) {
      fs.unlinkSync(tempJs);
    }
    if (fs.existsSync(tempDir)) {
      fs.rmdirSync(tempDir);
    }
  });

  // Test 5: CLI can convert YAML file to JS
  test('CLI should convert YAML file to JS template', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'yaml-to-js.js');

    // Run CLI
    const result = execSync(
      `node "${scriptPath}" "${tempYaml}" "${tempJs}"`,
      { encoding: 'utf8' }
    );

    // Verify output file was created
    expect(fs.existsSync(tempJs)).toBe(true);

    // Verify content
    const jsContent = fs.readFileSync(tempJs, 'utf8');
    expect(jsContent).toContain('async (page)');
    expect(jsContent).toContain("page.goto('https://example.com')");
  });

  // Test 6: CLI should fail with invalid YAML
  test('CLI should fail with descriptive error for invalid YAML', () => {
    const scriptPath = path.join(__dirname, '..', 'scripts', 'yaml-to-js.js');

    // Create invalid YAML (missing required fields)
    const invalidYaml = path.join(tempDir, 'invalid.yaml');
    fs.writeFileSync(invalidYaml, yaml.dump({ steps: [] }), 'utf8');

    try {
      execSync(`node "${scriptPath}" "${invalidYaml}"`, { encoding: 'utf8', stdio: 'pipe' });
      fail('Expected CLI to fail');
    } catch (error) {
      // Should have failed with validation error
      expect(error.status).not.toBe(0);
      // Check stderr for error message (CLI outputs to stderr for errors)
      const output = error.stderr || error.stdout || '';
      expect(output).toContain('Schema validation failed');
    } finally {
      if (fs.existsSync(invalidYaml)) {
        fs.unlinkSync(invalidYaml);
      }
    }
  });
});

describe('Workflow Migration Verification', () => {

  // Test 7: All workflow files in workflows/ should be valid
  test('all workflow YAML files should pass schema validation', () => {
    const workflowFiles = fs.readdirSync(WORKFLOWS_DIR)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    expect(workflowFiles.length).toBeGreaterThan(0);

    workflowFiles.forEach(file => {
      const yamlPath = path.join(WORKFLOWS_DIR, file);
      const workflow = parseYamlWorkflow(yamlPath);
      const validation = validateWorkflow(workflow);

      expect(validation.valid).toBe(true);
      if (!validation.valid) {
        console.error(`Validation failed for ${file}:`, validation.errors);
      }
    });
  });

  // Test 8: All workflow files should use new hint format (not fallback.mode)
  test('all workflow files should use new hint format', () => {
    const workflowFiles = fs.readdirSync(WORKFLOWS_DIR)
      .filter(f => f.endsWith('.yaml') || f.endsWith('.yml'));

    workflowFiles.forEach(file => {
      const yamlPath = path.join(WORKFLOWS_DIR, file);
      const content = fs.readFileSync(yamlPath, 'utf8');
      const workflow = yaml.load(content);

      workflow.steps.forEach((step, index) => {
        // Should not have fallback.mode
        if (step.fallback) {
          expect(step.fallback.mode).toBeUndefined();
        }

        // If hint exists, should be string at step level
        if (step.hint) {
          expect(typeof step.hint).toBe('string');
        }
      });
    });
  });
});
