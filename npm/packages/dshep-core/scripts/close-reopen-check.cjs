#!/usr/bin/env node
// Check that a built engine releases its file on close().
//
// Usage: node close-reopen-check.cjs <path-to-engine.node>
//
// Opens a store, writes a vector, closes it, checks a call after close fails,
// then opens the same file from a child process. Exits non-zero on any failure.
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const enginePath = process.argv[2] && resolve(process.argv[2]);
if (!enginePath) {
  console.error('usage: close-reopen-check.cjs <path-to-engine.node>');
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), 'ruvector-close-'));
const storagePath = join(dir, 'store.vectors');

async function main() {
  const { VectorDb } = require(enginePath);
  const db = new VectorDb({ dimensions: 3, storagePath });
  await db.insert({ id: 'a', vector: new Float32Array([1, 0, 0]), metadata: '{"k":"v"}' });
  db.close();
  db.close();

  let failedAfterClose = false;
  try {
    await db.len();
  } catch (error) {
    failedAfterClose = /closed/.test(String(error.message));
  }
  if (!failedAfterClose) throw new Error('a call after close() did not fail with "closed"');

  const child = `
    const { VectorDb } = require(${JSON.stringify(enginePath)});
    const db = new VectorDb({ dimensions: 3, storagePath: ${JSON.stringify(storagePath)} });
    db.len().then((n) => { db.close(); process.stdout.write(String(n)); })
      .catch((e) => { process.stderr.write(e.message); process.exit(1); });
  `;
  const count = execFileSync(process.execPath, ['-e', child]).toString().trim();
  if (count !== '1') throw new Error(`the child process read ${count} vectors, expected 1`);
  console.log(`close-reopen-check: ok — ${enginePath}`);
}

main()
  .catch((error) => {
    console.error(`close-reopen-check: FAILED — ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }));
