//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { DXN, ObjectId } from '@dxos/keys';
import { safeStringify } from '@dxos/util';

import * as Database from './Database';
import * as Json from './Json';

/** Mint a random ECHO object id usable as both a stub-db key and a DXN payload. */
const newId = (): string => ObjectId.random();

/** Build a fake encoded ref for a local-space object id. */
const encodeRef = (id: string): { '/': string } => ({ '/': DXN.fromLocalObjectId(id).toString() });

/** Minimal stub: `createRefReplacer` only touches `db.getObjectById`. */
const makeStubDb = (objects: Record<string, unknown>): Database.Database => {
  return {
    getObjectById: (id: string) => objects[id],
  } as unknown as Database.Database;
};

/**
 * Run a value through the replacer's public contract — `JSON.stringify(value, replacer)` —
 * then re-parse the result so tests can assert on plain JS shapes. This mirrors the way
 * the JSON highlighter invokes the replacer in production.
 */
const stringifyWith = (replacer: Json.JsonReplacer, value: unknown): unknown =>
  JSON.parse(JSON.stringify(value, replacer));

describe('createRefReplacer', () => {
  test('passes plain values through unchanged', () => {
    const replacer = Json.createRefReplacer({ db: makeStubDb({}) });
    const subject = { a: 1, b: 'two', c: [3, { d: 4 }] };
    expect(stringifyWith(replacer, subject)).toEqual(subject);
  });

  test('inlines refs at default depth (1)', () => {
    const id = newId();
    const target = { name: 'inlined' };
    const replacer = Json.createRefReplacer({ db: makeStubDb({ [id]: target }) });
    const subject = { ref: encodeRef(id) };
    expect(stringifyWith(replacer, subject)).toEqual({ ref: target });
  });

  test('does not follow refs when depth is 0', () => {
    const id = newId();
    const target = { name: 'inlined' };
    const ref = encodeRef(id);
    const replacer = Json.createRefReplacer({ db: makeStubDb({ [id]: target }), depth: 0 });
    expect(stringifyWith(replacer, { ref })).toEqual({ ref });
  });

  test('inlines refs across multiple levels up to depth', () => {
    const innerId = newId();
    const middleId = newId();
    const inner = { name: 'inner' };
    const middle = { ref: encodeRef(innerId) };
    const outer = { ref: encodeRef(middleId) };
    const db = makeStubDb({ [innerId]: inner, [middleId]: middle });

    expect(stringifyWith(Json.createRefReplacer({ db, depth: 1 }), outer)).toEqual({
      ref: { ref: encodeRef(innerId) },
    });

    expect(stringifyWith(Json.createRefReplacer({ db, depth: 2 }), outer)).toEqual({
      ref: { ref: inner },
    });
  });

  test('leaves refs encoded when the target is missing in the db', () => {
    const ref = encodeRef(newId());
    const replacer = Json.createRefReplacer({ db: makeStubDb({}) });
    expect(stringifyWith(replacer, { ref })).toEqual({ ref });
  });

  test('leaves non-DXN single-key { "/": string } objects untouched', () => {
    // Same `{ '/': string }` shape is used by other IPLD-style refs (e.g. CIDs); those should
    // not crash the replacer and should pass through verbatim.
    const cidLike = { '/': 'bafybeibwzifw7izxykxz' };
    const replacer = Json.createRefReplacer({ db: makeStubDb({}) });
    expect(stringifyWith(replacer, { ref: cidLike })).toEqual({ ref: cidLike });
  });

  test('leaves malformed dxn strings untouched', () => {
    const malformed = { '/': 'dxn:not-a-real-dxn' };
    const replacer = Json.createRefReplacer({ db: makeStubDb({}) });
    expect(stringifyWith(replacer, { ref: malformed })).toEqual({ ref: malformed });
  });

  test('leaves non-echo dxns untouched (e.g. type DXN)', () => {
    // Type DXNs share the `dxn:` prefix but `asEchoDXN()` returns undefined.
    const typeRef = { '/': DXN.fromTypename('com.example.Thing').toString() };
    const replacer = Json.createRefReplacer({ db: makeStubDb({}) });
    expect(stringifyWith(replacer, { ref: typeRef })).toEqual({ ref: typeRef });
  });

  test('inlines refs inside arrays', () => {
    const idA = newId();
    const idB = newId();
    const a = { name: 'a' };
    const b = { name: 'b' };
    const replacer = Json.createRefReplacer({ db: makeStubDb({ [idA]: a, [idB]: b }) });
    expect(stringifyWith(replacer, { items: [encodeRef(idA), encodeRef(idB), { plain: true }] })).toEqual({
      items: [a, b, { plain: true }],
    });
  });

  test('walks nested objects recursively', () => {
    const innerId = newId();
    const inner = { name: 'inner' };
    const replacer = Json.createRefReplacer({ db: makeStubDb({ [innerId]: inner }) });
    const subject = { outer: { mid: { ref: encodeRef(innerId) } } };
    expect(stringifyWith(replacer, subject)).toEqual({ outer: { mid: { ref: inner } } });
  });

  test('a single replacer invocation does not recurse on its own', () => {
    // The replacer is per-call; JSON.stringify drives the tree walk. Calling the replacer
    // directly on a cyclic input must therefore return without touching the cycle.
    const replacer = Json.createRefReplacer({ db: makeStubDb({}) });
    const node: any = { name: 'self' };
    node.self = node;

    expect(() => replacer('', node)).not.toThrow();
    expect(replacer('', node)).toBe(node);
  });

  test('invokes `toJSON` on resolved targets so refs in the target are re-walked', () => {
    // Simulates the ECHO-object branch: `db.getObjectById` returns a live proxy, the replacer
    // calls `.toJSON()` to get the encoded form, then continues walking that form. A ref nested
    // inside the target should be inlined when there's depth budget remaining.
    const outerId = newId();
    const innerId = newId();
    const inner = { name: 'inner' };
    const target = {
      toJSON: () => ({ nestedRef: encodeRef(innerId) }),
    };
    const replacer = Json.createRefReplacer({ db: makeStubDb({ [outerId]: target, [innerId]: inner }), depth: 2 });
    expect(stringifyWith(replacer, { ref: encodeRef(outerId) })).toEqual({
      ref: { nestedRef: inner },
    });
  });

  test('depth budget counts ref hops, not tree depth — a ref deep in a plain tree still resolves', () => {
    // A ref nested under arbitrarily many plain objects is one ref hop from the root, so
    // `depth: 1` resolves it. `depth: 0` leaves it encoded.
    const innerId = newId();
    const inner = { name: 'inner' };
    const subject = { a: { b: { c: { d: { ref: encodeRef(innerId) } } } } };

    const inlining = Json.createRefReplacer({ db: makeStubDb({ [innerId]: inner }), depth: 1 });
    expect(stringifyWith(inlining, subject)).toEqual({ a: { b: { c: { d: { ref: inner } } } } });

    const passthrough = Json.createRefReplacer({ db: makeStubDb({ [innerId]: inner }), depth: 0 });
    expect(stringifyWith(passthrough, subject)).toEqual(subject);
  });

  test('inlines refs when invoked through safeStringify (production path)', () => {
    // `JsonHighlighter` runs the replacer through `@dxos/util/safeStringify`, whose inner
    // wrapper short-circuits the root call without forwarding it to the user's filter. The
    // replacer must therefore work on a per-call basis — not as a one-shot root tree walk.
    // This regression-tests that integration: the `content` ref must inline.
    const targetId = newId();
    const target = { toJSON: () => ({ name: 'README content' }) };
    const document = { id: '01ABC', name: 'README', content: encodeRef(targetId) };

    const replacer = Json.createRefReplacer({ db: makeStubDb({ [targetId]: target }) });
    const out = JSON.parse(safeStringify(document, replacer, 0)!);

    expect(out).toEqual({ id: '01ABC', name: 'README', content: { name: 'README content' } });
  });
});
