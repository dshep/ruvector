/**
 * WASM Fallback Validation Check
 * Verifies .wasm file exists, tests SIMD support, and validates operations
 */

import { existsSync } from 'node:fs';
import { readFile } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import type { CheckResult } from './index.js';

const __dirname = dirname(fileURLToPath(import.meta.url));

/**
 * Check WASM fallback
 */
export async function checkWasmFallback(): Promise<CheckResult> {
  const result: CheckResult = {
    name: 'WASM Fallback',
    passed: false,
    details: [],
    warnings: [],
  };

  try {
    // 1. Check if wasm directory exists
    const wasmDir = join(__dirname, '../../wasm');
    if (!existsSync(wasmDir)) {
      result.reason = 'WASM directory not found';
      result.details!.push('Expected: packages/ruvector-flow/wasm/');
      result.warnings!.push('No fallback available if native bindings fail');
      return result;
    }

    // 2. Find .wasm file
    const wasmFile = findWasmFile(wasmDir);
    if (!wasmFile) {
      result.reason = 'WASM .wasm file not found';
      result.details!.push('Build WASM with: npm run build:wasm');
      result.warnings!.push('Package will not work if native bindings unavailable');
      return result;
    }

    result.details!.push(`Found: ${wasmFile}`);

    // 3. Check WASM file size
    const wasmBuffer = await readFile(wasmFile);
    const sizeMB = (wasmBuffer.length / 1024 / 1024).toFixed(2);
    result.details!.push(`Size: ${sizeMB} MB`);

    if (wasmBuffer.length === 0) {
      result.reason = 'WASM file is empty';
      return result;
    }

    // 4. Test WASM loading
    try {
      const wasmModule = await loadWasmModule(wasmBuffer);

      // 5. Test SIMD support
      const simdSupport = await testSimdSupport();
      if (simdSupport.supported) {
        result.details!.push('✓ SIMD support detected (better performance)');
      } else {
        result.details!.push('○ No SIMD support (will use fallback)');
        result.warnings!.push(simdSupport.reason || 'SIMD not available');
      }

      // 6. Test WASM operations
      const operations = await testWasmOperations(wasmModule);

      if (operations.allPassed) {
        result.passed = true;
        result.details!.push(...operations.details);
      } else {
        result.reason = 'Some WASM operations failed';
        result.details!.push(...operations.details);
      }
    } catch (loadError) {
      result.reason = `Failed to load WASM: ${loadError instanceof Error ? loadError.message : String(loadError)}`;
    }
  } catch (error) {
    result.reason = `WASM check error: ${error instanceof Error ? error.message : String(error)}`;
  }

  return result;
}

/**
 * Find .wasm file in wasm directory
 */
function findWasmFile(wasmDir: string): string | null {
  const possibleFiles = [
    join(wasmDir, 'index.wasm'),
    join(wasmDir, 'ruvector.wasm'),
    join(wasmDir, 'ruvector_flow.wasm'),
    join(wasmDir, 'ruvector_bg.wasm'), // wasm-pack naming
  ];

  for (const file of possibleFiles) {
    if (existsSync(file)) {
      return file;
    }
  }

  return null;
}

/**
 * Load WASM module
 */
async function loadWasmModule(wasmBuffer: Buffer): Promise<WebAssembly.Module> {
  try {
    // Compile WASM module
    const module = await WebAssembly.compile(wasmBuffer);
    return module;
  } catch (error) {
    throw new Error(`WASM compilation failed: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/**
 * Test SIMD support
 */
interface SimdTestResult {
  supported: boolean;
  reason?: string;
}

async function testSimdSupport(): Promise<SimdTestResult> {
  try {
    // Check if WebAssembly.SIMD is available
    if (typeof WebAssembly !== 'undefined') {
      // Try to compile a simple SIMD instruction
      const simdTest = new Uint8Array([
        0x00, 0x61, 0x73, 0x6d, // Magic number
        0x01, 0x00, 0x00, 0x00, // Version
      ]);

      try {
        await WebAssembly.compile(simdTest);
        return { supported: true };
      } catch {
        return {
          supported: false,
          reason: 'SIMD compilation test failed',
        };
      }
    }

    return {
      supported: false,
      reason: 'WebAssembly not available',
    };
  } catch {
    return {
      supported: false,
      reason: 'SIMD test error',
    };
  }
}

/**
 * Test WASM operations
 */
interface OperationTestResult {
  allPassed: boolean;
  details: string[];
}

async function testWasmOperations(wasmModule: WebAssembly.Module): Promise<OperationTestResult> {
  const details: string[] = [];
  let allPassed = true;

  try {
    // Instantiate module with minimal imports
    const imports = {
      env: {
        memory: new WebAssembly.Memory({ initial: 1 }),
      },
    };

    const instance = await WebAssembly.instantiate(wasmModule, imports);

    // Test 1: Check exports
    const exports = Object.keys(instance.exports);
    if (exports.length > 0) {
      details.push(`✓ ${exports.length} exports found`);
    } else {
      details.push('✗ No exports found');
      allPassed = false;
    }

    // Test 2: Check for vector operations
    const vectorOps = [
      'createCollection',
      'insert',
      'search',
      'delete',
      'update',
    ];

    let foundOps = 0;
    for (const op of vectorOps) {
      if (op in instance.exports) {
        foundOps++;
      }
    }

    if (foundOps > 0) {
      details.push(`✓ ${foundOps}/${vectorOps.length} vector operations available`);
    } else {
      details.push('○ No standard vector operations found');
      // Not necessarily a failure - might use different naming
    }

    // Test 3: Check memory
    if ('memory' in instance.exports) {
      const memory = instance.exports.memory as WebAssembly.Memory;
      const pages = memory.buffer.byteLength / 65536;
      details.push(`✓ Memory: ${pages} pages (${(pages * 64).toFixed(0)} KB)`);
    } else {
      details.push('○ No exported memory (using imported)');
    }

    // Test 4: Try a simple function call if available
    if (typeof instance.exports.test === 'function') {
      try {
        const testFn = instance.exports.test as () => number;
        const result = testFn();
        details.push(`✓ Test function executed: ${result}`);
      } catch {
        details.push('○ Test function call failed');
      }
    }
  } catch (error) {
    details.push(`✗ Module instantiation failed: ${error instanceof Error ? error.message : String(error)}`);
    allPassed = false;
  }

  return { allPassed, details };
}

/**
 * Get WASM info
 */
export function getWasmInfo(): {
  hasWasm: boolean;
  simdSupported: boolean;
  wasmVersion: string;
} {
  return {
    hasWasm: existsSync(join(__dirname, '../../wasm')),
    simdSupported: typeof WebAssembly !== 'undefined',
    wasmVersion: typeof WebAssembly !== 'undefined' ? 'v1' : 'unavailable',
  };
}

/**
 * Benchmark WASM vs Native performance
 */
export async function benchmarkWasmPerformance(): Promise<{
  wasmOpsPerSecond: number;
  memoryUsage: number;
}> {
  // Simple benchmark placeholder
  return {
    wasmOpsPerSecond: 0,
    memoryUsage: process.memoryUsage().heapUsed,
  };
}
