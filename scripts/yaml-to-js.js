#!/usr/bin/env node
/**
 * Deterministic YAML to JS Converter
 *
 * Converts workflow YAML files to executable JS templates.
 * This is a pure mechanical transformation with no AI interpretation.
 *
 * Usage:
 *   node scripts/yaml-to-js.js <input.yaml> [output.js]
 *
 * If output path is not specified, outputs to generated/<workflow-name>.template.js
 */

const fs = require('fs');
const path = require('path');
const yaml = require('js-yaml');
const Ajv = require('ajv');
const addFormats = require('ajv-formats');

const SCHEMA_PATH = path.join(__dirname, '..', 'schemas', 'workflow.schema.json');
const GENERATED_DIR = path.join(__dirname, '..', 'generated');

/**
 * Load and compile JSON Schema validator
 * @returns {object} Compiled validator
 */
function createValidator() {
  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const schema = JSON.parse(fs.readFileSync(SCHEMA_PATH, 'utf8'));
  return ajv.compile(schema);
}

/**
 * Validate workflow against JSON Schema
 * @param {object} workflow - Parsed workflow object
 * @returns {object} Validation result { valid: boolean, errors: array }
 */
function validateWorkflow(workflow) {
  const validate = createValidator();
  const valid = validate(workflow);

  if (!valid) {
    const errors = validate.errors.map(err => {
      return {
        path: err.instancePath || '(root)',
        message: err.message,
        keyword: err.keyword,
        params: err.params
      };
    });
    return { valid: false, errors };
  }

  return { valid: true, errors: null };
}

/**
 * Parse YAML file to workflow object
 * @param {string} yamlPath - Path to YAML file
 * @returns {object} Parsed workflow object
 */
function parseYamlWorkflow(yamlPath) {
  const yamlContent = fs.readFileSync(yamlPath, 'utf8');
  return yaml.load(yamlContent);
}

/**
 * Format a value for JS code output
 * @param {any} value - Value to format
 * @returns {string} Formatted JS value
 */
function formatJsValue(value) {
  if (typeof value === 'string') {
    return `'${value.replace(/'/g, "\\'")}'`;
  }

  if (typeof value === 'boolean' || typeof value === 'number') {
    return String(value);
  }

  return JSON.stringify(value);
}

/**
 * Convert variable interpolation syntax to JS template literal
 * @param {string} str - String with ${...} interpolation
 * @returns {string} JS expression for the value
 */
function convertInterpolation(str) {
  const VARIABLE_PATTERN = /\$\{(extract|input|constants)\.[a-zA-Z_][a-zA-Z0-9_]*\}/g;
  const FULL_VARIABLE_PATTERN = /^\$\{(extract|input|constants)\.[a-zA-Z_][a-zA-Z0-9_]*\}$/;

  // No interpolation - return as plain string
  if (!VARIABLE_PATTERN.test(str)) {
    return `'${str.replace(/'/g, "\\'")}'`;
  }

  // Single variable reference - return variable directly without template literal
  if (FULL_VARIABLE_PATTERN.test(str)) {
    return str.slice(2, -1);
  }

  // Mixed content - convert to template literal
  const escaped = str.replace(/'/g, "\\'");
  return '`' + escaped + '`';
}

/**
 * Convert comparison operator from YAML to JS
 * @param {string} op - YAML operator (==, !=, >, <, >=, <=)
 * @returns {string} JS comparison operator
 */
function convertOperator(op) {
  switch (op) {
    case '==':
      return '===';
    case '!=':
      return '!==';
    default:
      return op;
  }
}

/**
 * Convert a single condition to JS expression
 * @param {object} condition - Condition object { field, op, value }
 * @returns {string} JS condition expression
 */
function convertCondition(condition) {
  const { field, op, value } = condition;
  const jsOp = convertOperator(op);
  const jsValue = formatJsValue(value);
  return `${field} ${jsOp} ${jsValue}`;
}

/**
 * Convert when clause to JS if condition
 * @param {object} when - When clause object
 * @returns {string} JS condition string (without 'if')
 */
function convertWhenClause(when) {
  // Single condition
  if (when.field && when.op) {
    return convertCondition(when);
  }

  // Multiple conditions
  if (when.conditions && when.match) {
    const conditions = when.conditions.map(convertCondition);
    const connector = when.match === 'all' ? ' && ' : ' || ';
    return conditions.join(connector);
  }

  throw new Error('Invalid when clause structure');
}

/**
 * Generate execute function body for a step
 * @param {object} step - Step definition
 * @returns {string} JS code for execute function
 */
function generateExecuteBody(step) {
  const lines = [];

  switch (step.action) {
    case 'navigate':
      lines.push(`        await page.goto(${formatJsValue(step.url)});`);
      lines.push(`        await page.waitForLoadState('domcontentloaded');`);
      break;

    case 'fill': {
      const valueExpr = convertInterpolation(step.value);
      lines.push(`        await page.fill(${formatJsValue(step.selector)}, ${valueExpr});`);
      break;
    }

    case 'click':
      lines.push(`        await page.click(${formatJsValue(step.selector)});`);
      break;

    case 'press':
      lines.push(`        await page.press(${formatJsValue(step.selector)}, ${formatJsValue(step.key)});`);
      break;

    case 'wait': {
      const timeout = step.timeout || 30000;
      lines.push(`        await page.waitForSelector(${formatJsValue(step.selector)}, { timeout: ${timeout} });`);
      break;
    }

    case 'playwright_code':
      // Copy code block verbatim, with proper indentation
      const codeLines = step.code.split('\n');
      codeLines.forEach(line => {
        lines.push(`        ${line}`);
      });
      break;

    default:
      throw new Error(`Unknown action type: ${step.action}`);
  }

  return lines.join('\n');
}

/**
 * Generate execute function body with optional conditional wrapper
 * @param {object} step - Step definition
 * @returns {string[]} Lines of execute function code
 */
function generateExecuteFunction(step) {
  const executeBody = generateExecuteBody(step);
  const lines = [];

  lines.push(`      execute: async () => {`);

  if (step.when) {
    const condition = convertWhenClause(step.when);
    lines.push(`        if (${condition}) {`);
    const indentedBody = executeBody.split('\n').map(l => '  ' + l).join('\n');
    lines.push(indentedBody);
    lines.push(`        }`);
  } else {
    lines.push(executeBody);
  }

  lines.push(`      },`);
  return lines;
}

/**
 * Generate step object code
 * @param {object} step - Step definition
 * @param {number} index - Step index
 * @param {boolean} isLast - Whether this is the last step
 * @returns {string} JS code for step object
 */
function generateStepCode(step, index, isLast) {
  const lines = [];

  lines.push(`    // Step ${index}: ${step.name}`);
  lines.push(`    {`);
  lines.push(`      name: ${formatJsValue(step.name)},`);
  lines.push(`      action: ${formatJsValue(step.action)},`);

  if (step.selector) {
    lines.push(`      selector: ${formatJsValue(step.selector)},`);
  }

  lines.push(...generateExecuteFunction(step));

  if (step.output) {
    lines.push(`      output: ${formatJsValue(step.output)},`);
  }

  if (step.hint) {
    lines.push(`      hint: ${formatJsValue(step.hint)}`);
  }

  const trailingComma = isLast ? '' : ',';
  lines.push(`    }${trailingComma}`);

  return lines.join('\n');
}

/**
 * Convert workflow object to JS template code
 * @param {object} workflow - Validated workflow object
 * @returns {string} Generated JS template code
 */
function convertYamlToJs(workflow) {
  const lines = [];

  // Header comment
  lines.push(`// ${workflow.name} - Auto-generated template`);
  lines.push(`// Generated from: workflows/${workflow.name}.yaml`);
  if (workflow.description) {
    lines.push(`// ${workflow.description}`);
  }
  lines.push('');

  // Start async function
  lines.push('async (page) => {');
  lines.push('  const inputData = __INPUT_DATA__;');
  lines.push('  const { extract = {}, constants = {}, input = {}, startFromStep = 0 } = inputData;');
  lines.push('');

  // Generate steps array
  lines.push('  const steps = [');

  workflow.steps.forEach((step, index) => {
    const isLast = index === workflow.steps.length - 1;
    const stepCode = generateStepCode(step, index, isLast);
    lines.push(stepCode);
    lines.push('');
  });

  lines.push('  ];');
  lines.push('');

  // Results object and execution loop
  lines.push('  const results = { success: true, completedSteps: [], failedStep: null, output: {} };');
  lines.push('');
  lines.push('  for (let i = startFromStep; i < steps.length; i++) {');
  lines.push('    const step = steps[i];');
  lines.push('    try {');
  lines.push('      console.log(`Step ${i}: ${step.name}...`);');
  lines.push('      const stepResult = await step.execute();');
  lines.push('      results.completedSteps.push({ index: i, name: step.name, success: true });');
  lines.push('');
  lines.push('      if (step.output && stepResult !== undefined) {');
  lines.push('        results.output[step.output] = stepResult;');
  lines.push('      }');
  lines.push('    } catch (error) {');
  lines.push('      results.success = false;');
  lines.push('      results.failedStep = {');
  lines.push('        index: i,');
  lines.push('        name: step.name,');
  lines.push('        selector: step.selector,');
  lines.push('        hint: step.hint,');
  lines.push('        error: error.message');
  lines.push('      };');
  lines.push('      break;');
  lines.push('    }');
  lines.push('  }');
  lines.push('');
  lines.push('  return results;');
  lines.push('}');

  return lines.join('\n');
}

/**
 * Format validation errors for CLI output
 * @param {array} errors - Array of validation errors
 * @returns {string} Formatted error message
 */
function formatValidationErrors(errors) {
  return errors.map(err => {
    const lines = [
      `  - Path: ${err.path}`,
      `    Error: ${err.message}`
    ];
    if (err.params) {
      lines.push(`    Details: ${JSON.stringify(err.params)}`);
    }
    return lines.join('\n');
  }).join('\n\n');
}

/**
 * Main CLI entry point
 */
function main() {
  const args = process.argv.slice(2);

  if (args.length < 1 || args.includes('--help') || args.includes('-h')) {
    console.log(`
Usage: node scripts/yaml-to-js.js <input.yaml> [output.js]

Arguments:
  input.yaml    Path to the workflow YAML file
  output.js     Optional output path (default: generated/<workflow-name>.template.js)

Options:
  --help, -h    Show this help message

Example:
  node scripts/yaml-to-js.js workflows/amazon-product-search.yaml
  node scripts/yaml-to-js.js workflows/my-workflow.yaml generated/custom-output.js
    `);
    process.exit(0);
  }

  const inputPath = args[0];

  // Validate input file exists
  if (!fs.existsSync(inputPath)) {
    console.error(`Error: Input file not found: ${inputPath}`);
    process.exit(1);
  }

  // Parse YAML
  let workflow;
  try {
    workflow = parseYamlWorkflow(inputPath);
  } catch (err) {
    console.error(`Error: Failed to parse YAML: ${err.message}`);
    process.exit(1);
  }

  // Validate against schema
  const validation = validateWorkflow(workflow);
  if (!validation.valid) {
    console.error('Schema validation failed:\n');
    console.error(formatValidationErrors(validation.errors));
    process.exit(1);
  }

  // Convert to JS
  let jsCode;
  try {
    jsCode = convertYamlToJs(workflow);
  } catch (err) {
    console.error(`Error: Conversion failed: ${err.message}`);
    process.exit(1);
  }

  // Determine output path
  const outputPath = args[1] || path.join(GENERATED_DIR, `${workflow.name}.template.js`);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }

  // Write output
  fs.writeFileSync(outputPath, jsCode, 'utf8');
  console.log(`Generated: ${outputPath}`);
}

// Export for testing
module.exports = {
  convertYamlToJs,
  parseYamlWorkflow,
  validateWorkflow,
  convertWhenClause,
  convertInterpolation,
  formatJsValue
};

// Run CLI if executed directly
if (require.main === module) {
  main();
}
