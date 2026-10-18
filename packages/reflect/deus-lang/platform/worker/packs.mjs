//
// Copyright 2026 DXOS.org
//

// Packs (D180, Pack.Spec): beside each bundle, its objects as line text (`packs/<bundle>`) and a
// binary index of the lines sorted by hash (`packs/<bundle>.idx`). The Worker merges every pack's
// index into one combined index (`packindex`), which an isolate keeps in memory, so a lookup is a
// binary search and one ranged read of the line, however large the codebase.

import * as nameRules from './gen/names.js';
import * as objectsApi from './gen/objects.js';
import * as packFiles from './gen/packfiles.js';
import * as deus from './gen/packs.js';
import { warmLive } from './live.mjs';
import { HttpError, authorize, listAll, readHead } from './remote.mjs';

const HASH = /^[0-9a-f]{64}$/;

const FANOUT = 1024;

const RECORD = 48;

/** How long a pack listing is reused; packs are immutable, so only new ones can be missed. */
const LIST_SECONDS = 5;

/** Per bucket: the listing, each index's fanout, and recently read lines (both immutable). */
const state = new WeakMap();

const stateOf = (bucket) => {
  let entry = state.get(bucket);
  if (!entry) {
    entry = { listed: undefined, fanouts: new Map(), lines: new Map() };
    state.set(bucket, entry);
  }
  return entry;
};

/** `/v1/<project>/packs/…`: list, read with ranges, and write under the `push` scope (`Worker.PackFiles.serve`). */
export const packs = (request, env, ctx, project, rest) =>
  packFiles.serve(
    request,
    env.BUCKET,
    project,
    rest,
    (scope) => authorize(request, env, ctx, scope, project),
    (bundles) => mergeCombined(env.BUCKET, project, bundles),
    // The pack completes a push: drawing the head's explorer now spares its first visitor the wait (D192). A queue
    // consumer has minutes for it; without the queue (tests, local runs) the response's waitUntil tries.
    () => ctx.waitUntil(env.LIVE_QUEUE ? env.LIVE_QUEUE.send({ project }) : warmLive(env, ctx, project)),
  );

/** The bytes `[offset, offset + length)` of `key`. */
const bytesAt = async (bucket, key, offset, length) => {
  const object = await bucket.get(
    key,
    length === undefined && offset === 0 ? undefined : { range: { offset, length } },
  );
  if (!object) {
    throw new HttpError(404, `no ${key}`);
  }
  return new Uint8Array(await new Response(object.body).arrayBuffer());
};

/** The bundles whose pack is complete (its index is listed), listed at most every few seconds. */
const packed = async (bucket, project) => {
  const entry = stateOf(bucket);
  const cached = entry.listed?.get(project);
  if (cached && cached.at > Date.now() - LIST_SECONDS * 1000) {
    return cached.names;
  }
  const names = (await listAll(bucket, `${project}/packs/`))
    .filter((name) => name.endsWith('.idx'))
    .map((name) => name.slice(0, -4));
  entry.listed ??= new Map();
  entry.listed.set(project, { at: Date.now(), names });
  return names;
};

const fanoutOf = async (bucket, indexKey) => {
  const { fanouts } = stateOf(bucket);
  let fanout = fanouts.get(indexKey);
  if (!fanout) {
    const bytes = await bytesAt(bucket, indexKey, 0, FANOUT);
    fanout = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    fanouts.set(indexKey, fanout);
  }
  return fanout;
};

const compareKey = (records, at, key) => {
  for (let index = 0; index < 32; index++) {
    const diff = records[at + index] - key[index];
    if (diff !== 0) {
      return diff;
    }
  }
  return 0;
};

/** The index key of an object id: a hash's bytes, or any other id's SHA-256. */
const keyOf = async (id) => {
  const hexKey = HASH.test(id)
    ? id
    : Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256', new TextEncoder().encode(id))), (byte) =>
        byte.toString(16).padStart(2, '0'),
      ).join('');
  return Uint8Array.from({ length: 32 }, (_, index) => parseInt(hexKey.slice(index * 2, index * 2 + 2), 16));
};

/**
 * The record for (`key`, `kind`) among the sorted records `first` to `last` of `records`, as its byte offset there, or
 * -1 (`Worker.Packs.search`, in DEUS).
 */
const search = (records, first, last, key, kind) => deus.search(records, first, last, key, kind);

/**
 * Of the records equal to the one at `at`, the one from the pack merged last; metadata is rewritten in place, so only
 * its newest copy is current (`Worker.Packs.newestAt`, in DEUS).
 */
const newestAt = (records, at, first, last, key, kind) => deus.newestAt(records, at, first, last, key, kind);

/** How many lines an isolate keeps; namespace nodes near the root are read by nearly every lookup. */
const LINE_CACHE = 4096;

/** `obj <id> <text>` without its first two fields, kept in the isolate since packs never change. */
const lineAt = async (bucket, project, bundle, offset, length) => {
  const { lines } = stateOf(bucket);
  const cacheKey = `${project}/${bundle}/${offset}`;
  const cached = lines.get(cacheKey);
  if (cached !== undefined) {
    lines.delete(cacheKey);
    lines.set(cacheKey, cached);
    return cached;
  }
  const line = new TextDecoder().decode(await bytesAt(bucket, `${project}/packs/${bundle}`, offset, length));
  const text = line.slice(line.indexOf(' ', line.indexOf(' ') + 1) + 1);
  lines.set(cacheKey, text);
  if (lines.size > LINE_CACHE) {
    lines.delete(lines.keys().next().value);
  }
  return text;
};

//
// The combined index: every pack's records in one file, so a lookup searches memory and reads one line.
//

const COMBINED = (project) => `${project}/packindex`;

const MAGIC = 'DEUSIX1\n';

/**
 * Parses the combined index: `DEUSIX1\n`, a u32 byte length and that many bytes of pack names (one
 * per line; a record's ordinal is its pack's line), the fanout, then 48-byte records sorted by key
 * and kind: key (32), ordinal (u32), offset (u32), length (u32), kind (1), 3 zero bytes. A corrupt
 * one parses to undefined (`Worker.Packs.checkCombined`, in DEUS): reads then search each pack and
 * the next merge rewrites it.
 */
const parseCombined = (bytes, etag) => {
  const problem = deus.checkCombined(bytes);
  if (problem !== undefined) {
    console.warn(`combined index ignored: ${problem}`);
    return undefined;
  }
  const fanoutAt = deus.combinedFanout(bytes);
  const names = new TextDecoder().decode(bytes.subarray(12, fanoutAt)).split('\n').filter(Boolean);
  return {
    etag,
    names,
    fanout: new DataView(bytes.buffer, bytes.byteOffset + fanoutAt, FANOUT),
    records: bytes.subarray(fanoutAt + FANOUT),
  };
};

const encodeCombined = (names, records) => {
  const namesBytes = new TextEncoder().encode(names.map((name) => `${name}\n`).join(''));
  const out = new Uint8Array(12 + namesBytes.length + FANOUT + records.length);
  out.set(new TextEncoder().encode(MAGIC), 0);
  const view = new DataView(out.buffer);
  view.setUint32(8, namesBytes.length);
  out.set(namesBytes, 12);
  const fanoutAt = 12 + namesBytes.length;
  const counts = new Uint32Array(256);
  for (let at = 0; at < records.length; at += RECORD) {
    counts[records[at]]++;
  }
  let total = 0;
  for (let byte = 0; byte < 256; byte++) {
    total += counts[byte];
    view.setUint32(fanoutAt + byte * 4, total);
  }
  out.set(records, fanoutAt + FANOUT);
  return out;
};

/** The combined index, reused while its etag is unchanged and rechecked every few seconds. */
const combined = async (bucket, project) => {
  const entry = stateOf(bucket);
  entry.combined ??= new Map();
  const cached = entry.combined.get(project);
  if (cached && cached.at > Date.now() - LIST_SECONDS * 1000) {
    return cached.index;
  }
  const head = await bucket.head(COMBINED(project));
  let index = cached?.index;
  if (!head) {
    index = undefined;
  } else if (!index || index.etag !== head.etag) {
    const object = await bucket.get(COMBINED(project));
    index = object
      ? parseCombined(new Uint8Array(await new Response(object.body).arrayBuffer()), object.etag)
      : undefined;
  }
  entry.combined.set(project, { at: Date.now(), index });
  return index;
};

/**
 * Adds the packs of `bundles` to the combined index, with a conditional write so concurrent merges
 * retry instead of losing each other's packs. Returns how many packs the index then holds.
 */
export const mergeCombined = async (bucket, project, bundles) => {
  for (let attempt = 0; attempt < 5; attempt++) {
    const object = await bucket.get(COMBINED(project));
    const current = (object &&
      parseCombined(new Uint8Array(await new Response(object.body).arrayBuffer()), object.etag)) ?? {
      names: [],
      records: new Uint8Array(0),
    };
    const todo = [...new Set(bundles)].filter((bundle) => !current.names.includes(bundle));
    if (todo.length === 0) {
      return current.names.length;
    }
    const names = [...current.names];
    const added = [];
    for (const bundle of todo) {
      const ordinal = names.push(bundle) - 1;
      const index = await bytesAt(bucket, `${project}/packs/${bundle}.idx`, 0, undefined);
      const view = new DataView(index.buffer, index.byteOffset, index.byteLength);
      for (let at = FANOUT; at < index.length; at += RECORD) {
        if (view.getUint32(at + 32) !== 0) {
          throw new HttpError(500, `pack ${bundle} is past 4 GB`);
        }
        const record = new Uint8Array(RECORD);
        record.set(index.subarray(at, at + 32));
        const out = new DataView(record.buffer);
        out.setUint32(32, ordinal);
        out.setUint32(36, view.getUint32(at + 36));
        out.setUint32(40, view.getUint32(at + 40));
        record[44] = index[at + 44];
        added.push(record);
      }
    }
    const order = (left, right) => compareKey(left, 0, right) || left[44] - right[44];
    added.sort(order);
    // Both lists are sorted, so one merge pass keeps the whole index sorted.
    const merged = new Uint8Array(current.records.length + added.length * RECORD);
    let from = 0;
    let next = 0;
    let to = 0;
    while (from < current.records.length || next < added.length) {
      const old = from < current.records.length ? current.records.subarray(from, from + RECORD) : undefined;
      if (old && (next >= added.length || order(old, added[next]) <= 0)) {
        merged.set(old, to);
        from += RECORD;
      } else {
        merged.set(added[next], to);
        next++;
      }
      to += RECORD;
    }
    const written = await bucket.put(COMBINED(project), encodeCombined(names, merged), {
      onlyIf: object ? { etagMatches: object.etag } : new Headers({ 'if-none-match': '*' }),
      httpMetadata: { contentType: 'application/octet-stream' },
    });
    if (written !== null) {
      stateOf(bucket).combined?.delete(project);
      return names.length;
    }
  }
  throw new HttpError(503, 'the combined pack index kept changing; try again');
};

/** The text of object `id` (`kind` 1) or its metadata (2) in any pack of the project, or undefined. */
export const lookup = async (bucket, project, id, kind) => {
  const key = await keyOf(id);
  const [index, listed] = await Promise.all([combined(bucket, project), packed(bucket, project)]);
  if (index) {
    const low = key[0] === 0 ? 0 : index.fanout.getUint32((key[0] - 1) * 4);
    const high = index.fanout.getUint32(key[0] * 4) - 1;
    const match = search(index.records, low, high, key, kind);
    // Metadata in a pack the index does not hold yet is newer than any it holds, so that is looked at first.
    if (match >= 0 && (kind !== 2 || listed.every((bundle) => index.names.includes(bundle)))) {
      const at = newestAt(index.records, match, low, high, key, kind);
      const view = new DataView(index.records.buffer, index.records.byteOffset + at, RECORD);
      return lineAt(bucket, project, index.names[view.getUint32(32)], view.getUint32(36), view.getUint32(40));
    }
  }
  // Packs the combined index does not hold yet are searched one by one, all at once.
  const covered = new Set(index?.names ?? []);
  const found = await Promise.all(
    listed
      .filter((bundle) => !covered.has(bundle))
      .map(async (bundle) => {
        const indexKey = `${project}/packs/${bundle}.idx`;
        const fanout = await fanoutOf(bucket, indexKey);
        const low = key[0] === 0 ? 0 : fanout.getUint32((key[0] - 1) * 4);
        const high = fanout.getUint32(key[0] * 4);
        if (low === high) {
          return undefined;
        }
        const records = await bytesAt(bucket, indexKey, FANOUT + low * RECORD, (high - low) * RECORD);
        const at = search(records, 0, high - low - 1, key, kind);
        if (at < 0) {
          return undefined;
        }
        const view = new DataView(records.buffer, records.byteOffset + at, RECORD);
        return lineAt(bucket, project, bundle, view.getUint32(32) * 2 ** 32 + view.getUint32(36), view.getUint32(40));
      }),
  );
  const fresh = found.find((text) => text !== undefined);
  if (fresh !== undefined || !index) {
    return fresh;
  }
  const low = key[0] === 0 ? 0 : index.fanout.getUint32((key[0] - 1) * 4);
  const high = index.fanout.getUint32(key[0] * 4) - 1;
  const match = search(index.records, low, high, key, kind);
  if (match < 0) {
    return undefined;
  }
  const view = new DataView(
    index.records.buffer,
    index.records.byteOffset + newestAt(index.records, match, low, high, key, kind),
    RECORD,
  );
  return lineAt(bucket, project, index.names[view.getUint32(32)], view.getUint32(36), view.getUint32(40));
};

/** Lines of one pack closer than this are read with one ranged read, the bytes between them discarded. */
const GAP = 256 * 1024;

/** Ranged reads in flight at once; a Worker keeps at most six connections open anyway. */
const SPANS_IN_FLIGHT = 6;

/**
 * `lookup` for many (`id`, `kind`) pairs at once, as a Map from `kind:id` to text (absent when no pack
 * has it). Lines the combined index places are read pack by pack, nearby lines in one ranged read, so
 * thousands of objects cost a few hundred reads; the rest go through `lookup`.
 */
export const lookupMany = async (bucket, project, wanted) => {
  const found = new Map();
  const index = await combined(bucket, project);
  const byPack = new Map();
  const rest = [];
  for (const [id, kind] of wanted) {
    const key = await keyOf(id);
    let at = -1;
    if (index) {
      const low = key[0] === 0 ? 0 : index.fanout.getUint32((key[0] - 1) * 4);
      const high = index.fanout.getUint32(key[0] * 4) - 1;
      at = search(index.records, low, high, key, kind);
      at = at < 0 ? at : newestAt(index.records, at, low, high, key, kind);
    }
    if (at < 0) {
      rest.push([id, kind]);
      continue;
    }
    const view = new DataView(index.records.buffer, index.records.byteOffset + at, RECORD);
    const bundle = index.names[view.getUint32(32)];
    const lines = byPack.get(bundle) ?? [];
    lines.push({ id, kind, offset: view.getUint32(36), length: view.getUint32(40) });
    byPack.set(bundle, lines);
  }
  const spans = [];
  for (const [bundle, lines] of byPack) {
    lines.sort((left, right) => left.offset - right.offset);
    let span;
    for (const line of lines) {
      if (span && line.offset - span.end <= GAP) {
        span.lines.push(line);
        span.end = Math.max(span.end, line.offset + line.length);
      } else {
        span = { bundle, start: line.offset, end: line.offset + line.length, lines: [line] };
        spans.push(span);
      }
    }
  }
  const decoder = new TextDecoder();
  const readSpan = async (span) => {
    const bytes = await bytesAt(bucket, `${project}/packs/${span.bundle}`, span.start, span.end - span.start);
    for (const line of span.lines) {
      const text = decoder.decode(bytes.subarray(line.offset - span.start, line.offset - span.start + line.length));
      found.set(`${line.kind}:${line.id}`, text.slice(text.indexOf(' ', text.indexOf(' ') + 1) + 1));
    }
  };
  const queue = [...spans];
  await Promise.all(
    Array.from({ length: Math.min(SPANS_IN_FLIGHT, queue.length) }, async () => {
      while (queue.length > 0) {
        await readSpan(queue.pop());
      }
    }),
  );
  await Promise.all(
    rest.map(async ([id, kind]) => {
      const text = await lookup(bucket, project, id, kind);
      if (text !== undefined) {
        found.set(`${kind}:${id}`, text);
      }
    }),
  );
  return found;
};

/** `/v1/<project>/objects/<id>` and `/v1/<project>/meta/<id>`: one object's canonical text (`Worker.Objects.serve`). */
export const objects = (request, env, project, area, rest) =>
  objectsApi.serve(request, area, rest, (id, kind) => lookup(env.BUCKET, project, id, kind));

//
// Names: a branch head's namespace tree, walked object by object.
//

/** Reads one canonical S-expression into nested arrays; strings become `{ s }`, symbols stay strings. */
export const parseSexp = (text) => {
  let at = 0;
  const skip = () => {
    while (at < text.length && /\s/.test(text[at])) {
      at++;
    }
  };
  const value = () => {
    skip();
    const char = text[at];
    if (char === '(') {
      at++;
      const items = [];
      skip();
      while (text[at] !== ')') {
        if (at >= text.length) {
          throw new HttpError(500, 'an object ends inside a list');
        }
        items.push(value());
        skip();
      }
      at++;
      return items;
    }
    if (char === '"') {
      let out = '';
      at++;
      while (text[at] !== '"') {
        if (text[at] === '\\') {
          const next = text[at + 1];
          if (next === 'u') {
            out += String.fromCharCode(parseInt(text.slice(at + 2, at + 6), 16));
            at += 6;
            continue;
          }
          out += { n: '\n', t: '\t', r: '\r' }[next] ?? next;
          at += 2;
          continue;
        }
        out += text[at++];
      }
      at++;
      return { s: out };
    }
    const start = at;
    while (at < text.length && !/[\s()"]/.test(text[at])) {
      at++;
    }
    return text.slice(start, at);
  };
  return value();
};

/** `/v1/<project>/names/<branch>/<Name>`: the entry, hash and text of a name at the branch's head (`Worker.Names.serve`). */
export const names = (request, env, project, rest) =>
  nameRules.serve(
    request,
    rest,
    (branch) => readHead(env, project, branch),
    (causal, name) => nameAt(env.BUCKET, project, causal, name),
  );

/**
 * A name's entry, hash and object text in the namespace of history node `causal`, or undefined
 * when it has none; throws a 404 when the node is in no pack yet.
 */
export const nameAt = async (bucket, project, causal, name) => {
  // What the name holds is `Worker.Names.resolve`, in DEUS, walking by the toolchain's own `Codebase.lookupFormWith`.
  // The walk reads a node's parts one by one, so the reader fetches them all in one batch as soon as their node arrives.
  const read = new Map();
  const reader = (hash) => {
    if (!read.has(hash)) {
      read.set(
        hash,
        lookup(bucket, project, hash, 1).then((text) => {
          const parts = [...(text ?? '').matchAll(/\(part "([0-9a-f]{64})"\)/g)].map((match) => match[1]);
          const fresh = parts.filter((part) => !read.has(part));
          if (fresh.length > 0) {
            const batch = lookupMany(
              bucket,
              project,
              fresh.map((part) => [part, 1]),
            );
            for (const part of fresh) {
              const text = batch.then((texts) => texts.get(`1:${part}`) ?? lookup(bucket, project, part, 1));
              // A walk that stops early never awaits some parts; their failures are its failure, not unhandled ones.
              text.catch(() => {});
              read.set(part, text);
            }
          }
          return text;
        }),
      );
    }
    return read.get(hash);
  };
  const found = await nameRules.resolve(reader, causal, name);
  if (found.outcome === 'missing') {
    throw new HttpError(404, found.message);
  }
  if (found.outcome === 'unbound') {
    return undefined;
  }
  return { entry: found.entry, hash: found.hash, text: found.hasText ? found.text : null };
};
