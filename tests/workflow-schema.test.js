/**
 * Workflow Schema Validation Tests
 *
 * Tests for JSON Schema validation of YAML workflow definitions.
 * These tests verify:
 * - Valid YAML passes validation
 * - Invalid YAML returns appropriate errors
 * - `when` clause structured format validation
 * - `hint` field placement validation (step-level, not nested in fallback)
 */

const Ajv = require('ajv');
const addFormats = require('ajv-formats');
const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');

const SCHEMA_PATH = path.join(__dirname, '..', 'schemas', 'workflow.schema.json');

let ajv;
let validate;

beforeAll(() => {
  ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);

  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  validate = ajv.compile(schema);
});

describe('Workflow Schema Validation', () => {

  // Test 1: Valid YAML passes validation
  test('valid workflow YAML should pass validation', () => {
    const validWorkflow = {
      name: 'test-workflow',
      description: 'A test workflow',
      input: {
        keyword: {
          type: 'string',
          required: true,
          description: 'Search keyword',
          example: 'test'
        }
      },
      constants: {
        max_results: 10
      },
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
        }
      ],
      output: {
        results: {
          description: 'Search results'
        }
      }
    };

    const isValid = validate(validWorkflow);
    expect(isValid).toBe(true);
    expect(validate.errors).toBeNull();
  });

  // Test 2: Invalid YAML (missing required field) returns appropriate error
  test('workflow missing required "name" field should fail validation', () => {
    const invalidWorkflow = {
      description: 'Missing name field',
      steps: []
    };

    const isValid = validate(invalidWorkflow);
    expect(isValid).toBe(false);
    expect(validate.errors).toBeDefined();
    expect(validate.errors.some(e => e.instancePath === '' && e.message.includes('name'))).toBe(true);
  });

  // Test 3: Invalid step action type should fail validation
  test('step with invalid action type should fail validation', () => {
    const invalidWorkflow = {
      name: 'test-workflow',
      steps: [
        {
          name: 'Invalid step',
          action: 'invalid_action',
          url: 'https://example.com'
        }
      ]
    };

    const isValid = validate(invalidWorkflow);
    expect(isValid).toBe(false);
    expect(validate.errors).toBeDefined();
  });

  // Test 4: `when` clause structured format validation
  test('when clause with valid structured format should pass validation', () => {
    const workflowWithWhen = {
      name: 'test-workflow',
      steps: [
        {
          name: 'Conditional step',
          action: 'click',
          selector: '#button',
          when: {
            field: 'extract.amount',
            op: '>',
            value: 10000
          }
        }
      ]
    };

    const isValid = validate(workflowWithWhen);
    expect(isValid).toBe(true);
  });

  // Test 5: `when` clause with invalid operator should fail validation
  test('when clause with invalid operator should fail validation', () => {
    const workflowWithInvalidWhen = {
      name: 'test-workflow',
      steps: [
        {
          name: 'Conditional step',
          action: 'click',
          selector: '#button',
          when: {
            field: 'extract.amount',
            op: 'contains',  // Invalid operator
            value: 'test'
          }
        }
      ]
    };

    const isValid = validate(workflowWithInvalidWhen);
    expect(isValid).toBe(false);
  });

  // Test 6: Multiple conditions with match field validation
  test('when clause with multiple conditions and match field should pass validation', () => {
    const workflowWithMultipleConditions = {
      name: 'test-workflow',
      steps: [
        {
          name: 'Conditional step',
          action: 'click',
          selector: '#button',
          when: {
            conditions: [
              { field: 'extract.amount', op: '>', value: 1000 },
              { field: 'input.enabled', op: '==', value: true }
            ],
            match: 'all'
          }
        }
      ]
    };

    const isValid = validate(workflowWithMultipleConditions);
    expect(isValid).toBe(true);
  });

  // Test 7: `hint` field should be at step level (not nested in fallback)
  test('hint field at step level should pass validation', () => {
    const workflowWithHint = {
      name: 'test-workflow',
      steps: [
        {
          name: 'Click button',
          action: 'click',
          selector: '#submit',
          hint: 'Submit button at the bottom of the form'
        }
      ]
    };

    const isValid = validate(workflowWithHint);
    expect(isValid).toBe(true);
  });

  // Test 8: fallback.mode should NOT be valid (deprecated)
  test('fallback.mode field should fail validation (deprecated)', () => {
    const workflowWithFallbackMode = {
      name: 'test-workflow',
      steps: [
        {
          name: 'Click button',
          action: 'click',
          selector: '#submit',
          fallback: {
            mode: 'ai_search',
            hint: 'Submit button'
          }
        }
      ]
    };

    const isValid = validate(workflowWithFallbackMode);
    expect(isValid).toBe(false);
  });
});
