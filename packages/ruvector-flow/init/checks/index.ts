/**
 * @ruvector/flow - Initialization Validation Checks
 * Main check runner that validates all 350+ features are properly configured
 */

import { checkNativeBindings } from './native-check.js';
import { checkWasmFallback } from './wasm-check.js';
import { checkSkills } from './skills-check.js';
import { checkAgents } from './agents-check.js';
import { checkCommands } from './commands-check.js';
import { checkMcpServer } from './mcp-check.js';

export interface CheckResult {
  name: string;
  passed: boolean;
  reason?: string;
  details?: string[];
  warnings?: string[];
}

export interface ValidationReport {
  timestamp: Date;
  totalChecks: number;
  passed: number;
  failed: number;
  warnings: number;
  results: CheckResult[];
  summary: string;
}

/**
 * Run all initialization validation checks
 */
export async function runAllChecks(): Promise<ValidationReport> {
  const startTime = Date.now();
  const results: CheckResult[] = [];

  console.log('🔍 Running @ruvector/flow initialization checks...\n');

  // 1. Native bindings check
  console.log('1/6 Checking native bindings...');
  const nativeResult = await checkNativeBindings();
  results.push(nativeResult);
  printResult(nativeResult);

  // 2. WASM fallback check
  console.log('\n2/6 Checking WASM fallback...');
  const wasmResult = await checkWasmFallback();
  results.push(wasmResult);
  printResult(wasmResult);

  // 3. Skills validation
  console.log('\n3/6 Validating skills...');
  const skillsResult = await checkSkills();
  results.push(skillsResult);
  printResult(skillsResult);

  // 4. Agents validation
  console.log('\n4/6 Validating agents...');
  const agentsResult = await checkAgents();
  results.push(agentsResult);
  printResult(agentsResult);

  // 5. Commands validation
  console.log('\n5/6 Validating commands...');
  const commandsResult = await checkCommands();
  results.push(commandsResult);
  printResult(commandsResult);

  // 6. MCP server check
  console.log('\n6/6 Checking MCP server...');
  const mcpResult = await checkMcpServer();
  results.push(mcpResult);
  printResult(mcpResult);

  // Generate report
  const report = generateReport(results, startTime);
  printSummary(report);

  return report;
}

/**
 * Print individual check result
 */
function printResult(result: CheckResult): void {
  const icon = result.passed ? '✓' : '✗';
  const color = result.passed ? '\x1b[32m' : '\x1b[31m';
  const reset = '\x1b[0m';

  console.log(`  ${color}${icon} ${result.name}${reset}`);

  if (result.reason && !result.passed) {
    console.log(`    ${result.reason}`);
  }

  if (result.details && result.details.length > 0) {
    result.details.forEach(detail => {
      console.log(`    • ${detail}`);
    });
  }

  if (result.warnings && result.warnings.length > 0) {
    result.warnings.forEach(warning => {
      console.log(`    \x1b[33m⚠ ${warning}\x1b[0m`);
    });
  }
}

/**
 * Generate comprehensive validation report
 */
function generateReport(results: CheckResult[], startTime: number): ValidationReport {
  const passed = results.filter(r => r.passed).length;
  const failed = results.filter(r => !r.passed).length;
  const warnings = results.reduce((sum, r) => sum + (r.warnings?.length || 0), 0);

  const elapsedTime = Date.now() - startTime;
  const summary = generateSummary(passed, failed, warnings, elapsedTime);

  return {
    timestamp: new Date(),
    totalChecks: results.length,
    passed,
    failed,
    warnings,
    results,
    summary,
  };
}

/**
 * Generate summary text
 */
function generateSummary(
  passed: number,
  failed: number,
  warnings: number,
  elapsedTime: number
): string {
  const total = passed + failed;
  const percentage = total > 0 ? Math.round((passed / total) * 100) : 0;

  let summary = `Validation completed in ${elapsedTime}ms\n`;
  summary += `${passed}/${total} checks passed (${percentage}%)`;

  if (failed > 0) {
    summary += `\n${failed} check(s) failed`;
  }

  if (warnings > 0) {
    summary += `\n${warnings} warning(s) detected`;
  }

  return summary;
}

/**
 * Print final summary
 */
function printSummary(report: ValidationReport): void {
  console.log('\n' + '═'.repeat(60));

  if (report.failed === 0) {
    console.log('\x1b[32m✓ All checks passed!\x1b[0m');
  } else {
    console.log('\x1b[31m✗ Some checks failed\x1b[0m');
  }

  console.log('═'.repeat(60));
  console.log(report.summary);
  console.log('═'.repeat(60));

  if (report.failed > 0) {
    console.log('\nFailed checks:');
    report.results
      .filter(r => !r.passed)
      .forEach(r => {
        console.log(`  • ${r.name}: ${r.reason}`);
      });
  }

  if (report.warnings > 0) {
    console.log('\nWarnings:');
    report.results.forEach(r => {
      r.warnings?.forEach(w => {
        console.log(`  ⚠ ${r.name}: ${w}`);
      });
    });
  }
}

/**
 * Run checks from CLI
 */
export async function runChecksFromCli(): Promise<void> {
  try {
    const report = await runAllChecks();
    const exitCode = report.failed > 0 ? 1 : 0;
    process.exit(exitCode);
  } catch (error) {
    console.error('\n\x1b[31m✗ Fatal error during validation:\x1b[0m');
    console.error(error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  runChecksFromCli();
}
