import { defineConfig } from 'tsup';

export default defineConfig([
  // Main entry point
  {
    entry: ['src/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    clean: true,
    sourcemap: true,
    outDir: 'dist',
    splitting: false,
    treeshake: true,
    minify: false,
    target: 'es2022',
    external: [
      '@google/generative-ai',
      'dotenv',
      'zod',
      'dspy.ts',
      'commander'
    ]
  },
  // Generators subpath export
  {
    entry: ['src/generators/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    outDir: 'dist/generators',
    target: 'es2022',
    external: [
      '@google/generative-ai',
      'dotenv',
      'zod',
      'dspy.ts'
    ]
  },
  // Cache subpath export
  {
    entry: ['src/cache/index.ts'],
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    outDir: 'dist/cache',
    target: 'es2022',
    external: []
  }
]);
