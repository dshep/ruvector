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
// a writer, each refusal with the lock message LedgerDB recognises. In this
// process: a reader is refused while a writer is open, with the lock message
// and a note that this process is the holder, and opens once the writer's
// close() resolves; a writer is then refused while that reader is open. A
// read-only open of a missing file is refused with "no vector store at" and its
// path, and creates nothing; one of an empty file is refused the same way and
// leaves it empty.
// Exits non-zero on any failure.
const { execFileSync } = require('node:child_process');
const { createHash } = require('node:crypto');
const { existsSync, mkdtempSync, readFileSync, rmSync, statSync, utimesSync, writeFileSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const enginePath = process.argv[2] && resolve(process.argv[2]);
if (!enginePath) {
  console.error('usage: read-only-check.cjs <path-to-engine.node>');
  process.exit(2);
}

const LOCK = /cannot acquire lock|already open/i;
const HELD_HERE = /this process holds the file in the other mode/;
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

// A refusal by another process's lock: the lock message, with no in-process note.
function expectRefused(outcome, what) {
  if (outcome.error === undefined) throw new Error(`${what}: opened (read ${outcome.count} vectors)`);
  if (!LOCK.test(outcome.error)) throw new Error(`${what}: refused without the lock message: ${outcome.error}`);
  if (HELD_HERE.test(outcome.error)) throw new Error(`${what}: refused as if this process held the file: ${outcome.error}`);
}

// The message an open throws, or undefined when it opens (the handle is closed).
async function openError(open) {
  let db;
  try {
    db = open();
  } catch (error) {
    return String(error.message);
  }
  await db.close();
  return undefined;
}

// A refusal by this process's own hold: the lock message and the in-process note.
async function expectRefusedHere(open, what) {
  const message = await openError(open);
  if (message === undefined) throw new Error(`${what}: opened`);
  if (!LOCK.test(message)) throw new Error(`${what}: refused without the lock message: ${message}`);
  if (!HELD_HERE.test(message)) throw new Error(`${what}: refused without saying this process holds the file: ${message}`);
}

// A read-only open of a file that holds no store: refused naming it.
async function expectNoVectorStore(VectorDb, path, what) {
  const message = await openError(() => new VectorDb({ dimensions: 3, storagePath: path, readOnly: true }));
  if (message === undefined || !message.includes(`no vector store at ${path}`)) {
    throw new Error(`a read-only open of ${what} was not refused with "no vector store at" naming it: ${message}`);
  }
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
  await expectRefusedHere(
    () => new VectorDb({ dimensions: 3, storagePath, readOnly: true }),
    'a reader in this process while it holds the file writable',
  );
  await holder.close();

  const lateReader = new VectorDb({ dimensions: 3, storagePath, readOnly: true });
  if ((await lateReader.len()) !== 2) throw new Error('a reader opened after the writer closed did not count 2 vectors');
  await expectRefusedHere(
    () => new VectorDb({ dimensions: 3, storagePath }),
    'a writer in this process while it holds the file read-only',
  );
  await lateReader.close();

  const missing = join(dir, 'absent', 'store.vectors');
  await expectNoVectorStore(VectorDb, missing, 'a missing file');
  if (existsSync(join(dir, 'absent'))) throw new Error('a read-only open of a missing file created its folder');

  const empty = join(dir, 'empty.vectors');
  writeFileSync(empty, '');
  await expectNoVectorStore(VectorDb, empty, 'an empty file');
  if (statSync(empty).size !== 0) throw new Error('a read-only open of an empty file changed its size');

  console.log(`read-only-check: ok — ${enginePath}`);
}

main()
  .catch((error) => {
    console.error(`read-only-check: FAILED — ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }));
