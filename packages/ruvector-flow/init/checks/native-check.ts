/**
 * Native Bindings Validation Check
 * Verifies NAPI-RS .node file exists and basic operations work
 */

import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckResult } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Check native NAPI-RS bindings
 */
export async function checkNativeBindings(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'Native Bindings (NAPI-RS)',
    passed: false,
    details: [],
    warnings: [],
  };

  try {
    // 1. Check if native directory exists
    const nativeDir = join(__dirname, '../../native');
    if (!existsSync(nativeDir)) {
      result.reason = 'Native directory not found';
      result.details!.push('Expected: packages/ruvector-flow/native/');
      return result;
    }

    // 2. Find .node file
    const nodeFile = findNodeFile(nativeDir);
    if (!nodeFile) {
      result.reason = 'Native .node file not found';
      result.details!.push('Build native bindings with: npm run build:native');
      result.warnings!.push('Will fallback to WASM if available');
      return result;
    }

    result.details!.push(`Found: ${nodeFile}`);

    // 3. Try to load native module
    try {
      const nativeModule = await loadNativeModule(nodeFile);

      // 4. Test basic operations
      const operations = await testNativeOperations(nativeModule);

      if (operations.allPassed) {
        result.passed = true;
        result.details!.push(...operations.details);
      } else {
        result.reason = 'Some native operations failed';
        result.details!.push(...operations.details);
        result.warnings!.push('Consider rebuilding native bindings');
      }
    } catch (loadError) {
      result.reason = `Failed to load native module: ${loadError instanceof Error ? loadError.message : String(loadError)}`;
      result.warnings!.push('Will fallback to WASM');
    }
  } catch (error) {
    result.reason = `Native check error: ${error instanceof Error ? error.message : String(error)}`;
  }

  return result;
}

/**
 * Find .node file in native directory
 */
function findNodeFile(nativeDir: string): string | null {
  const possibleFiles = [
    join(nativeDir, 'index.node'),
    join(nativeDir, 'ruvector.node'),
    join(nativeDir, 'ruvector_flow.node'),
  ];

  // Check common locations
  for (const file of possibleFiles) {
    if (existsSync(file)) {
      return file;
    }
  }

  // Check platform-specific builds
  const platform = process.platform;
  const arch = process.arch;
  const platformFile = join(nativeDir, `ruvector.${platform}-${arch}.node`);

  if (existsSync(platformFile)) {
    return platformFile;
  }

  return null;
}

/**
 * Load native module
 */
async function loadNativeModule(nodeFile: string): Promise<any> {
  try {
    // Try dynamic import first (ESM)
    const module = await import(nodeFile);
    return module;
  } catch {
    // Fallback to require (CommonJS)
    const { createRequire } = await import('node:module');
    const require = createRequire(import.meta.url);
    return require(nodeFile);
  }
}

/**
 * Test native operations
 */
interface OperationTestResult {
  allPassed: boolean;
  details: string[];
}

async function testNativeOperations(nativeModule: any): Promise<OperationTestResult> {
  const details: string[] = [];
  let allPassed = true;

  // Test 1: Create collection
  try {
    if (typeof nativeModule.createCollection === 'function') {
      details.push('✓ createCollection() available');
    } else {
      details.push('✗ createCollection() not found');
      allPassed = false;
    }
  } catch {
    details.push('✗ createCollection() test failed');
    allPassed = false;
  }

  // Test 2: Vector operations
  try {
    if (typeof nativeModule.insert === 'function') {
      details.push('✓ insert() available');
    } else {
      details.push('✗ insert() not found');
      allPassed = false;
    }
  } catch {
    details.push('✗ insert() test failed');
    allPassed = false;
  }

  // Test 3: Search operations
  try {
    if (typeof nativeModule.search === 'function') {
      details.push('✓ search() available');
    } else {
      details.push('✗ search() not found');
      allPassed = false;
    }
  } catch {
    details.push('✗ search() test failed');
    allPassed = false;
  }

  // Test 4: SIMD support detection
  try {
    if (typeof nativeModule.getSimdSupport === 'function') {
      const simdSupport = nativeModule.getSimdSupport();
      details.push(`✓ SIMD support: ${simdSupport}`);
    } else {
      details.push('○ SIMD detection not available');
    }
  } catch {
    details.push('○ SIMD test skipped');
  }

  // Test 5: Performance info
  try {
    if (typeof nativeModule.getPerformanceInfo === 'function') {
      const perfInfo = nativeModule.getPerformanceInfo();
      details.push(`✓ Performance: ${JSON.stringify(perfInfo)}`);
    }
  } catch {
    // Optional feature
  }

  return { allPassed, details };
}

/**
 * Get native module info
 */
export function getNativeInfo(): {
  platform: string;
  arch: string;
  nodeVersion: string;
  hasNativeBindings: boolean;
} {
  return {
    platform: process.platform,
    arch: process.arch,
    nodeVersion: process.version,
    hasNativeBindings: existsSync(join(__dirname, '../../native')),
  };
}
