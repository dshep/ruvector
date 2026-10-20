// Tests for assemble.mjs, run as a child process against temporary directories.
//
// Usage: node --test npm/packages/dshep-core/scripts/assemble.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const script = join(here, 'assemble.mjs');
const upstream = JSON.parse(readFileSync(join(here, '..', '..', 'core', 'package.json'), 'utf8')).version;

// Stated here rather than imported: importing assemble.mjs runs it.
const EXPECTED = {
  'linux-x64-gnu': { os: ['linux'], cpu: ['x64'], libc: ['glibc'] },
  'linux-arm64-gnu': { os: ['linux'], cpu: ['arm64'], libc: ['glibc'] },
  'darwin-x64': { os: ['darwin'], cpu: ['x64'] },
  'darwin-arm64': { os: ['darwin'], cpu: ['arm64'] },
  'win32-x64-msvc': { os: ['win32'], cpu: ['x64'] },
};
const PLATFORMS = Object.keys(EXPECTED);

function workspace(t, platforms = PLATFORMS) {
  const root = mkdtempSync(join(tmpdir(), 'dshep-assemble-'));
  t.after(() => rmSync(root, { recursive: true, force: true }));
  const artifacts = join(root, 'artifacts');
  for (const platform of platforms) {
    mkdirSync(join(artifacts, `bindings-${platform}`), { recursive: true });
    writeFileSync(join(artifacts, `bindings-${platform}`, 'ruvector.node'), `engine for ${platform}`);
  }
  return { artifacts, out: join(root, 'dist') };
}

function assemble(version, { artifacts, out }) {
  return spawnSync(process.execPath, [script, version, artifacts, out], { encoding: 'utf8' });
}

function readJson(path) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

test('the upstream version this suite reads is a release version', () => {
  assert.match(upstream, /^\d+\.\d+\.\d+$/);
});

for (const version of [
  `${upstream}-ledgerdb.0`,
  `${upstream}-ledgerdb.01`,
  `${upstream}-ledgerdb`,
  `${upstream}-ledgerdb.1x`,
  `${upstream}0-ledgerdb.1`,
  `${upstream.replace(/\./g, 'x')}-ledgerdb.1`,
  `9.9.9-ledgerdb.1`,
  upstream,
]) {
  test(`version '${version}' is refused and nothing is written`, (t) => {
    const dirs = workspace(t);
    const run = assemble(version, dirs);
    assert.notEqual(run.status, 0, run.stdout);
    assert.match(run.stderr, /must be .*-ledgerdb\.<n>/);
    assert.equal(existsSync(dirs.out), false);
  });
}

for (const absent of PLATFORMS) {
  test(`a missing ${absent} binary is refused and nothing is written`, (t) => {
    const dirs = workspace(
      t,
      PLATFORMS.filter((p) => p !== absent)
    );
    const run = assemble(`${upstream}-ledgerdb.1`, dirs);
    assert.notEqual(run.status, 0, run.stdout);
    assert.match(run.stderr, new RegExp(`no binary for: ${absent}`));
    assert.equal(existsSync(dirs.out), false);
  });
}

test('a complete set produces the main package and five platform packages', (t) => {
  const dirs = workspace(t);
  const version = `${upstream}-ledgerdb.12`;
  const run = assemble(version, dirs);
  assert.equal(run.status, 0, run.stderr);

  assert.deepEqual(readdirSync(dirs.out).sort(), [...PLATFORMS, 'main'].sort());

  for (const [platform, constraints] of Object.entries(EXPECTED)) {
    const dir = join(dirs.out, platform);
    const pkg = readJson(join(dir, 'package.json'));
    assert.equal(pkg.name, `@dshep/ruvector-core-${platform}`);
    assert.equal(pkg.version, version);
    assert.equal(pkg.main, 'ruvector.node');
    assert.deepEqual(pkg.files, ['ruvector.node']);
    assert.deepEqual(pkg.os, constraints.os);
    assert.deepEqual(pkg.cpu, constraints.cpu);
    assert.deepEqual(pkg.libc, constraints.libc);
    assert.equal(pkg.publishConfig.registry, 'https://npm.pkg.github.com');
    assert.equal(readFileSync(join(dir, 'ruvector.node'), 'utf8'), `engine for ${platform}`);
  }

  const main = readJson(join(dirs.out, 'main', 'package.json'));
  assert.equal(main.name, '@dshep/ruvector-core');
  assert.equal(main.version, version);
  assert.deepEqual(
    main.optionalDependencies,
    Object.fromEntries(PLATFORMS.map((p) => [`@dshep/ruvector-core-${p}`, version]))
  );
  for (const file of main.files) assert.ok(existsSync(join(dirs.out, 'main', file)), `main package lacks ${file}`);
});
