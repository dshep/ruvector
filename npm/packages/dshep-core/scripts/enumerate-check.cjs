#!/usr/bin/env node
// Check that a built engine's enumerate() lists every entry with its id,
// metadata and vector, on a writable and a read-only open.
//
// Usage: node enumerate-check.cjs <path-to-engine.node>
//
// An empty store enumerates to []. A store holding three entries, inserted out
// of id order and one without metadata, enumerates to all three in id order,
// each with its id, its vector as a Float32Array equal to the one inserted, and
// its metadata as JSON text equal, up to key order, to what was stored and to
// what get() returns (absent when none was stored).
// After a delete the entry is gone. A read-only open of the closed store
// enumerates the same entries and leaves the file's bytes (sha256) and
// modification time unchanged. A call after close() rejects as closed.
// Exits non-zero on any failure.
const { createHash } = require('node:crypto');
const { mkdtempSync, readFileSync, rmSync, statSync, utimesSync } = require('node:fs');
const { tmpdir } = require('node:os');
const { join, resolve } = require('node:path');

const enginePath = process.argv[2] && resolve(process.argv[2]);
if (!enginePath) {
  console.error('usage: enumerate-check.cjs <path-to-engine.node>');
  process.exit(2);
}

const dir = mkdtempSync(join(tmpdir(), 'ruvector-enumerate-'));
const storagePath = join(dir, 'store.vectors');

const ENTRIES = [
  { id: 'doc:2', vector: [0, 1, 0.5], metadata: { type: 'doc', n: 2, tags: ['a', 'b'] } },
  { id: 'ep-1', vector: [1, 0, -0.25] },
  { id: 'doc:10', vector: [0.125, 0.25, 0.75], metadata: { type: 'doc', nested: { k: true } } },
];

function fingerprint() {
  return {
    sha256: createHash('sha256').update(readFileSync(storagePath)).digest('hex'),
    mtimeNs: statSync(storagePath, { bigint: true }).mtimeNs,
  };
}

// The entries enumerate() returned, checked against `expected` (in id order)
// and against get() for each id.
async function expectEntries(db, expected, what) {
  const listed = await db.enumerate();
  if (!Array.isArray(listed)) throw new Error(`${what}: enumerate() returned ${typeof listed}, not an array`);
  const ids = listed.map((e) => e.id);
  const want = expected.map((e) => e.id).sort();
  if (JSON.stringify(ids) !== JSON.stringify(want)) {
    throw new Error(`${what}: enumerate() listed ${JSON.stringify(ids)}, expected ${JSON.stringify(want)} in id order`);
  }
  for (const entry of listed) {
    const source = expected.find((e) => e.id === entry.id);
    if (!(entry.vector instanceof Float32Array)) throw new Error(`${what}: ${entry.id}'s vector is not a Float32Array`);
    if (JSON.stringify(Array.from(entry.vector)) !== JSON.stringify(source.vector)) {
      throw new Error(`${what}: ${entry.id}'s vector is ${JSON.stringify(Array.from(entry.vector))}, expected ${JSON.stringify(source.vector)}`);
    }
    if (source.metadata === undefined) {
      if (entry.metadata != null) throw new Error(`${what}: ${entry.id} has metadata ${entry.metadata}, expected none`);
    } else if (typeof entry.metadata !== 'string' || canonical(entry.metadata) !== JSON.stringify(sortKeys(source.metadata))) {
      throw new Error(`${what}: ${entry.id}'s metadata is ${entry.metadata}, expected ${JSON.stringify(source.metadata)}`);
    }
    const got = await db.get(entry.id);
    if (got === null || (got.metadata == null) !== (entry.metadata == null) || (got.metadata != null && canonical(got.metadata) !== canonical(entry.metadata))) {
      throw new Error(`${what}: ${entry.id}'s metadata ${entry.metadata} differs from get()'s ${got && got.metadata}`);
    }
  }
}

// The engine re-serializes metadata from a map, so its key order is not kept:
// metadata is compared with every object's keys sorted.
function canonical(text) {
  return JSON.stringify(sortKeys(JSON.parse(text)));
}

function sortKeys(value) {
  if (Array.isArray(value)) return value.map(sortKeys);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(Object.keys(value).sort().map((k) => [k, sortKeys(value[k])]));
}

async function main() {
  const { VectorDb } = require(enginePath);

  const writer = new VectorDb({ dimensions: 3, storagePath });
  if (typeof writer.enumerate !== 'function') throw new Error('this engine has no enumerate()');
  const empty = await writer.enumerate();
  if (!Array.isArray(empty) || empty.length !== 0) throw new Error(`an empty store enumerated to ${JSON.stringify(empty)}`);

  for (const e of ENTRIES) {
    await writer.insert({
      id: e.id,
      vector: new Float32Array(e.vector),
      ...(e.metadata ? { metadata: JSON.stringify(e.metadata) } : {}),
    });
  }
  await expectEntries(writer, ENTRIES, 'a writable open');

  await writer.insert({ id: 'gone', vector: new Float32Array([0, 0, 1]) });
  if (!(await writer.delete('gone'))) throw new Error('delete("gone") reported nothing deleted');
  await expectEntries(writer, ENTRIES, 'a writable open after a delete');
  await writer.close();

  // A time far in the past, so any write moves it whatever the file system's
  // timestamp granularity.
  utimesSync(storagePath, new Date(1e12), new Date(1e12));
  const before = fingerprint();

  const reader = new VectorDb({ dimensions: 3, storagePath, readOnly: true });
  await expectEntries(reader, ENTRIES, 'a read-only open');
  await reader.close();

  const after = fingerprint();
  if (after.sha256 !== before.sha256) throw new Error('enumerate on a read-only open changed the file bytes');
  if (after.mtimeNs !== before.mtimeNs) throw new Error('enumerate on a read-only open changed the file modification time');

  try {
    await reader.enumerate();
  } catch (error) {
    if (!/the database is closed/.test(String(error.message))) {
      throw new Error(`enumerate() after close() rejected without "the database is closed": ${error.message}`);
    }
    console.log(`enumerate-check: ok — ${enginePath}`);
    return;
  }
  throw new Error('enumerate() after close() succeeded');
}

main()
  .catch((error) => {
    console.error(`enumerate-check: FAILED — ${error.message}`);
    process.exitCode = 1;
  })
  .finally(() => rmSync(dir, { recursive: true, force: true }));
