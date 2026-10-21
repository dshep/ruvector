#!/usr/bin/env node
// Check that a built engine's read-only open writes nothing and shares the file
// only with other readers.
//
// Usage: node read-only-check.cjs <path-to-engine.node>
//
// Writes a store and closes it, then opens it read-only, searches, reads, has
// every write rejected and closes, and checks the file's bytes (sha256) and
// modification time are unchanged. Then, from a second process: a second
// reader opens while this process holds a reader, a writer is refused while
// this process holds a reader, and a reader is refused while this process holds
// a writer, each refusal with the lock message LedgerDB recognises. A read-only
// open of a missing file is refused naming it, and creates nothing.
// Exits non-zero on any failure.
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { existsSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const enginePath = process.argv[2] && resolve(process.argv[2]);
if (!enginePath) {
  console.error('usage: read-only-check.cjs <path-to-engine.node>');
  process.exit(2);
}

const LOCK = /cannot acquire lock|already open/i;
const READ_ONLY = /the database is open read-only/;

const dir = mkdtempSync(join(tmpdir(), 'ruvector-read-only-'));
const storagePath = join(dir, 'store.vectors');

function fingerprint() {
  return {
    sha256: createHash('sha256').update(readFileSync(storagePath)).digest('hex'),
    mtimeNs: statSync(storagePath, { bigint: true }).mtimeNs,
  };
}

// Open the store in a child process; its vector count, or the error message.
function openInChild(readOnly) {
  const child = `
    const { VectorDb } = require(${JSON.stringify(enginePath)});
    let db;
    try {
      db = new VectorDb({ dimensions: 3, storagePath: ${JSON.stringify(storagePath)}, readOnly: ${readOnly} });
    } catch (e) {
      process.stdout.write(JSON.stringify({ error: e.message }));
      process.exit(0);
    }
    db.len().then(async (n) => { await db.close(); process.stdout.write(JSON.stringify({ count: n })); })
      .catch((e) => { process.stderr.write(e.message); process.exit(1); });
  `;
  return JSON.parse(execFileSync(process.execPath, ['-e', child]).toString());
}

function expectRefused(outcome, what) {
  if (outcome.error === undefined) throw new Error(`${what}: opened (read ${outcome.count} vectors)`);
  if (!LOCK.test(outcome.error)) throw new Error(`${what}: refused without the lock message: ${outcome.error}`);
}

async function expectRejected(call, what) {
  try {
    await call();
  } catch (error) {
    if (READ_ONLY.test(String(error.message))) return;
    throw new Error(`${what} rejected without "the database is open read-only": ${error.message}`);
  }
  throw new Error(`${what} succeeded on a read-only database`);
}

async function main() {
  const { VectorDb } = require(enginePath);

  const writer = new VectorDb({ dimensions: 3, storagePath });
  await writer.insert({ id: 'a', vector: new Float32Array([1, 0, 0]), metadata: '{"k":"v"}' });
  await writer.insert({ id: 'b', vector: new Float32Array([0, 1, 0]) });
  await writer.close();

  // A time far in the past, so any write moves it whatever the file system's
  // timestamp granularity.
  utimesSync(storagePath, new Date(1e12), new Date(1e12));
  const before = fingerprint();

  const reader = new VectorDb({ dimensions: 3, storagePath, readOnly: true });
  const results = await reader.search({ vector: new Float32Array([1, 0, 0]), k: 2 });
  if (results.length !== 2 || results[0].id !== 'a') {
    throw new Error(`a read-only search returned ${JSON.stringify(results.map((r) => r.id))}`);
  }
  if ((await reader.len()) !== 2) throw new Error('a read-only len() did not count 2 vectors');
  if ((await reader.get('a')) === null) throw new Error('a read-only get() did not find "a"');
  await expectRejected(() => reader.insert({ id: 'c', vector: new Float32Array([0, 0, 1]) }), 'insert');
  await expectRejected(() => reader.insertBatch([{ id: 'c', vector: new Float32Array([0, 0, 1]) }]), 'insertBatch');
  await expectRejected(() => reader.delete('a'), 'delete');

  const second = openInChild(true);
  if (second.count !== 2) throw new Error(`a second reader in another process: ${JSON.stringify(second)}`);
  expectRefused(openInChild(false), 'a writer in another process while a reader holds the file');
  await reader.close();

  const after = fingerprint();
  if (after.sha256 !== before.sha256) throw new Error('a read-only open changed the file bytes');
  if (after.mtimeNs !== before.mtimeNs) throw new Error('a read-only open changed the file modification time');

  const holder = new VectorDb({ dimensions: 3, storagePath });
  expectRefused(openInChild(true), 'a reader in another process while a writer holds the file');
  await holder.close();

  const missing = join(dir, 'absent', 'store.vectors');
  let refusal;
  try {
    new VectorDb({ dimensions: 3, storagePath: missing, readOnly: true });
  } catch (error) {
    refusal = error.message;
  }
  if (refusal === undefined || !refusal.includes(missing)) {
    throw new Error(`a read-only open of a missing file was not refused naming it: ${refusal}`);
  }
  if (existsSync(join(dir, 'absent'))) throw new Error('a read-only open of a missing file created its folder');

  console.log(`read-only-check: ok — ${enginePath}`);
}

main()
  .catch((error) => {
    console.error(`read-only-check: FAILED — ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }));
