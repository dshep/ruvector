#!/usr/bin/env node
// Check that a built engine releases its file on close().
//
// Usage: node close-reopen-check.cjs <path-to-engine.node>
//
// Opens a store, writes a vector, issues slow writes without awaiting them and
// closes at once. Checks that close() leaves the JS thread free while those
// writes run, that every write issued before close() completes, that a call
// issued after close() fails, that a second close() resolves once the file is
// released, and that a child process then reads every vector from the file.
// Exits non-zero on any failure.
const { execFileSync } = require('node:child_process');
const { mkdtempSync, rmSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');
const { performance } = require('node:perf_hooks');

const enginePath = process.argv[2] && resolve(process.argv[2]);
if (!enginePath) {
  console.error('usage: close-reopen-check.cjs <path-to-engine.node>');
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), 'ruvector-close-'));
const storagePath = join(dir, 'store.vectors');
const PENDING = 50;
// Each pending write is a batch, so the writes are still running while the
// JS thread is checked below.
const BATCH = 100;

function batch(i) {
  return Array.from({ length: BATCH }, (_, j) => ({
    id: `p${i}-${j}`,
    vector: new Float32Array([Math.sin(i * BATCH + j), Math.cos(j), i]),
  }));
}

function countInChild() {
  const child = `
    const { VectorDb } = require(${JSON.stringify(enginePath)});
    const db = new VectorDb({ dimensions: 3, storagePath: ${JSON.stringify(storagePath)} });
    db.len().then(async (n) => { await db.close(); process.stdout.write(String(n)); })
      .catch((e) => { process.stderr.write(e.message); process.exit(1); });
  `;
  return execFileSync(process.execPath, ['-e', child]).toString().trim();
}

async function main() {
  const { VectorDb } = require(enginePath);
  const db = new VectorDb({ dimensions: 3, storagePath });
  await db.insert({ id: 'a', vector: new Float32Array([1, 0, 0]), metadata: '{"k":"v"}' });
  const pending = [];
  for (let i = 0; i < PENDING; i++) pending.push(db.insertBatch(batch(i)));

  let immediateAt;
  let closedAt;
  const calledAt = performance.now();
  const closing = db.close();
  const returnedAt = performance.now();
  setImmediate(() => {
    immediateAt = performance.now();
  });
  const afterClose = db.len();
  const secondClose = db.close();
  closing.then(() => {
    closedAt = performance.now();
  });

  if (!(closing instanceof Promise)) throw new Error('close() did not return a promise');

  let failedAfterClose = false;
  try {
    await afterClose;
  } catch (error) {
    failedAfterClose = /the database is closed/.test(String(error.message));
  }
  if (!failedAfterClose) throw new Error('a call issued after close() did not fail with "the database is closed"');

  // The second close() resolves no earlier than the first one's release, so
  // the file opens from another process as soon as it resolves.
  await secondClose;
  const count = countInChild();
  await closing;

  const settled = await Promise.allSettled(pending);
  const rejected = settled.filter((s) => s.status === 'rejected');
  if (rejected.length > 0) {
    throw new Error(
      `${rejected.length} of ${PENDING} writes issued before close() failed: ${rejected[0].reason.message}`,
    );
  }

  const expected = String(1 + PENDING * BATCH);
  if (count !== expected) throw new Error(`the child process read ${count} vectors, expected ${expected}`);

  const pendingFor = closedAt - calledAt;
  const blockedFor = returnedAt - calledAt;
  if (immediateAt === undefined || immediateAt > closedAt) {
    throw new Error('a callback scheduled after close() did not run before close() resolved');
  }
  if (blockedFor * 2 > pendingFor) {
    throw new Error(
      `close() held the JS thread for ${blockedFor.toFixed(1)} ms of the ${pendingFor.toFixed(1)} ms it was pending`,
    );
  }
  console.log(
    `close-reopen-check: ok — ${enginePath} (close() returned in ${blockedFor.toFixed(1)} ms, ` +
      `resolved after ${pendingFor.toFixed(1)} ms)`,
  );
}

main()
  .catch((error) => {
    console.error(`close-reopen-check: FAILED — ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }));
