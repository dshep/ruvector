#!/usr/bin/env node
// Check that a built engine releases its file on close().
//
// Usage: node close-reopen-check.cjs <path-to-engine.node>
//
// Opens a store, writes a vector, issues more writes without awaiting them and
// closes at once: every write issued before close() must complete. Then checks
// a call after close fails, and opens the same file from a child process, which
// must read every vector. Exits non-zero on any failure.
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
const PENDING = 50;

async function main() {
  const { VectorDb } = require(enginePath);
  const db = new VectorDb({ dimensions: 3, storagePath });
  await db.insert({ id: 'a', vector: new Float32Array([1, 0, 0]), metadata: '{"k":"v"}' });
  const pending = [];
  for (let i = 0; i < PENDING; i++) {
    pending.push(db.insert({ id: `p${i}`, vector: new Float32Array([0, 1, i]) }));
  }
  db.close();
  db.close();

  const settled = await Promise.allSettled(pending);
  const rejected = settled.filter((s) => s.status === 'rejected');
  if (rejected.length > 0) {
    throw new Error(
      `${rejected.length} of ${PENDING} inserts issued before close() failed: ${rejected[0].reason.message}`,
    );
  }

  let failedAfterClose = false;
  try {
    await db.len();
  } catch (error) {
    failedAfterClose = /the database is closed/.test(String(error.message));
  }
  if (!failedAfterClose) throw new Error('a call after close() did not fail with "the database is closed"');

  const child = `
    const { VectorDb } = require(${JSON.stringify(enginePath)});
    const db = new VectorDb({ dimensions: 3, storagePath: ${JSON.stringify(storagePath)} });
    db.len().then((n) => { db.close(); process.stdout.write(String(n)); })
      .catch((e) => { process.stderr.write(e.message); process.exit(1); });
  `;
  const count = execFileSync(process.execPath, ['-e', child]).toString().trim();
  const expected = String(1 + PENDING);
  if (count !== expected) throw new Error(`the child process read ${count} vectors, expected ${expected}`);
  console.log(`close-reopen-check: ok — ${enginePath}`);
}

main()
  .catch((error) => {
    console.error(`close-reopen-check: FAILED — ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }));
