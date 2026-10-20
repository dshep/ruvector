// Tests for platforms.cjs, the platform table and engine-package resolver, and
// for index.js's use of it.
//
// Usage: node --test npm/packages/dshep-core/scripts/platforms.test.mjs
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';
import { dirname, join } from 'node:path';
import { test } from 'node:test';
import { fileURLToPath } from 'node:url';
import platforms from '../platforms.cjs';

const { PLATFORMS, packageName, packageFor } = platforms;
const pkgDir = join(dirname(fileURLToPath(import.meta.url)), '..');

test('the table names the five built platforms', () => {
  assert.deepEqual(Object.keys(PLATFORMS).sort(), [
    'darwin-arm64',
    'darwin-x64',
    'linux-arm64-gnu',
    'linux-x64-gnu',
    'win32-x64-msvc',
  ]);
});

for (const [key, c] of Object.entries(PLATFORMS)) {
  const host = { platform: c.os[0], arch: c.cpu[0], glibc: Boolean(c.libc && c.libc.includes('glibc')) };
  test(`${host.platform} ${host.arch}${host.glibc ? ' on glibc' : ''} loads ${packageName(key)}`, () => {
    assert.equal(packageFor(host), `@dshep/ruvector-core-${key}`);
  });
}

for (const host of [
  { platform: 'freebsd', arch: 'x64' },
  { platform: 'linux', arch: 'ia32', glibc: true },
  { platform: 'win32', arch: 'arm64' },
  { platform: 'darwin', arch: 'ppc64' },
]) {
  test(`${host.platform} ${host.arch} is refused as unsupported`, () => {
    assert.throws(
      () => packageFor(host),
      new RegExp(`^Error: @dshep/ruvector-core has no prebuilt engine for ${host.platform}-${host.arch}; built: `)
    );
  });
}

for (const arch of ['x64', 'arm64']) {
  for (const glibc of [false, undefined]) {
    test(`linux ${arch} without a known glibc is refused, never given the glibc build (glibc: ${glibc})`, () => {
      assert.throws(
        () => packageFor({ platform: 'linux', arch, glibc }),
        new RegExp(`^Error: @dshep/ruvector-core has no prebuilt engine for linux-${arch}-musl; built: .*linux-${arch}-gnu`)
      );
    });
  }
}

test('macOS and Windows hosts never need glibc', () => {
  assert.equal(packageFor({ platform: 'darwin', arch: 'arm64', glibc: false }), '@dshep/ruvector-core-darwin-arm64');
  assert.equal(packageFor({ platform: 'win32', arch: 'x64', glibc: false }), '@dshep/ruvector-core-win32-x64-msvc');
});

test('index.js resolves this host through the table and names the missing engine package', () => {
  // No engine package is installed beside the source tree, so loading fails
  // with the message for this host.
  const glibc =
    process.platform === 'linux' && Boolean(process.report.getReport().header.glibcVersionRuntime);
  let expected;
  try {
    const name = packageFor({ platform: process.platform, arch: process.arch, glibc });
    expected = `The engine package ${name} is not installed. Reinstall @dshep/ruvector-core with optional dependencies enabled.`;
  } catch (error) {
    expected = error.message;
  }
  const run = spawnSync(process.execPath, ['-e', "require('./index.js')"], { cwd: pkgDir, encoding: 'utf8' });
  assert.notEqual(run.status, 0, run.stdout);
  assert.ok(run.stderr.includes(expected), `stderr lacks "${expected}":\n${run.stderr}`);
});
