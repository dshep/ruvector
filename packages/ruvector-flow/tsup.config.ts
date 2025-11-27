import { defineConfig } from 'tsup';

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    cli: 'src/cli.ts',
    mcp: 'src/mcp.ts',
  },
  format: ['esm', 'cjs'],
  dts: true,
  splitting: false,
  sourcemap: true,
  clean: true,
  shims: true,
  treeshake: true,
  minify: false,
  target: 'es2022',
  outDir: 'dist',
  external: [
    '@ruvector/core',
  ],
  // Ensure CLI has proper shebang
  banner: ({ format, path }) => {
    if (path.includes('cli')) {
      return {
        js: '#!/usr/bin/env node',
      };
    }
    return {};
  },
  // Handle NAPI-RS native modules
  noExternal: [],
  // Platform-specific builds for WASM
  platform: 'node',
  // Preserve dynamic imports for lazy-loading WASM
  splitting: true,
  // Bundle type definitions
  dts: {
    resolve: true,
  },
});
