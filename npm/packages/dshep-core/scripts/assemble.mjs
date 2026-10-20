#!/usr/bin/env node
// Assemble @dshep/ruvector-core and its five platform packages for publishing.
//
// Usage: node assemble.mjs <version> <artifacts-dir> <out-dir>
//   <version>        <upstream>-ledgerdb.<n>, where <upstream> is the version in
//                    npm/packages/core/package.json
//   <artifacts-dir>  holds bindings-<platform>/ruvector.node for every platform
//   <out-dir>        receives one directory per package, ready for `npm publish`
//
// Exits non-zero, writing nothing further, when the version is malformed or any
// platform's binary is missing: a partial set must never be published.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const pkgDir = join(here, '..');
const upstreamPkg = join(pkgDir, '..', 'core', 'package.json');

export const PLATFORMS = {
  'linux-x64-gnu': { os: ['linux'], cpu: ['x64'], libc: ['glibc'] },
  'linux-arm64-gnu': { os: ['linux'], cpu: ['arm64'], libc: ['glibc'] },
  'darwin-x64': { os: ['darwin'], cpu: ['x64'] },
  'darwin-arm64': { os: ['darwin'], cpu: ['arm64'] },
  'win32-x64-msvc': { os: ['win32'], cpu: ['x64'] },
};

function fail(message) {
  console.error(`assemble: ${message}`);
  process.exit(1);
}

const [version, artifactsDir, outDir] = process.argv.slice(2);
if (!version || !artifactsDir || !outDir) fail('usage: assemble.mjs <version> <artifacts-dir> <out-dir>');

const upstream = JSON.parse(readFileSync(upstreamPkg, 'utf8')).version;
const versionRe = new RegExp(`^${upstream.replace(/\./g, '\\.')}-ledgerdb\\.[1-9][0-9]*$`);
if (!versionRe.test(version)) {
  fail(`version '${version}' must be ${upstream}-ledgerdb.<n> (upstream @ruvector/core is ${upstream})`);
}

const missing = Object.keys(PLATFORMS).filter(
  (p) => !existsSync(join(artifactsDir, `bindings-${p}`, 'ruvector.node'))
);
if (missing.length > 0) fail(`no binary for: ${missing.join(', ')} — refusing to assemble a partial set`);

const base = JSON.parse(readFileSync(join(pkgDir, 'package.json'), 'utf8'));
const optionalDependencies = {};

for (const [platform, constraints] of Object.entries(PLATFORMS)) {
  const name = `@dshep/ruvector-core-${platform}`;
  const dir = join(outDir, platform);
  mkdirSync(dir, { recursive: true });
  copyFileSync(join(artifactsDir, `bindings-${platform}`, 'ruvector.node'), join(dir, 'ruvector.node'));
  writeFileSync(
    join(dir, 'package.json'),
    JSON.stringify(
      {
        name,
        version,
        description: `The ${platform} engine binary for @dshep/ruvector-core`,
        main: 'ruvector.node',
        files: ['ruvector.node'],
        license: base.license,
        repository: base.repository,
        ...constraints,
        publishConfig: base.publishConfig,
      },
      null,
      2
    ) + '\n'
  );
  optionalDependencies[name] = version;
}

const mainDir = join(outDir, 'main');
mkdirSync(mainDir, { recursive: true });
for (const file of base.files) copyFileSync(join(pkgDir, file), join(mainDir, file));
writeFileSync(
  join(mainDir, 'package.json'),
  JSON.stringify({ ...base, version, optionalDependencies }, null, 2) + '\n'
);

console.log(`assembled @dshep/ruvector-core ${version} and ${Object.keys(PLATFORMS).length} platform packages in ${outDir}`);
