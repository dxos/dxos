//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { afterEach, beforeEach, describe, test } from 'vitest';

import { Blob, Database } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';

import { getObjectCore } from '../echo-handler';
import { EchoTestBuilder } from '../testing';

/**
 * Constructor names / shapes of every leaf reachable from a document value, so the stored
 * representation is named rather than assumed.
 */
const leafTypes = (value: unknown, depth = 0): string[] => {
  if (depth > 8 || value === null || value === undefined) {
    return [];
  }
  if (value instanceof Uint8Array) {
    return [`Uint8Array(${value.byteLength})`];
  }
  if (typeof value === 'string') {
    return value.length > 64 ? [`string(${value.length})`] : [];
  }
  if (Array.isArray(value)) {
    return value.flatMap((entry) => leafTypes(entry, depth + 1));
  }
  if (typeof value === 'object') {
    const name = value.constructor?.name;
    return [
      ...(name && name !== 'Object' ? [name] : []),
      ...Object.values(value).flatMap((entry) => leafTypes(entry, depth + 1)),
    ];
  }
  return [];
};

describe('inline blob representation', () => {
  let builder: EchoTestBuilder;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
  });

  afterEach(async () => {
    await builder.close();
  });

  // An inline blob's bytes must reach the document as one native binary scalar. Encoded as a string
  // they would become a per-character text CRDT below `STRING_CRDT_LIMIT` (300k) — `object-core.ts`
  // bypasses that for `Uint8Array`, and this pins the bypass so a change to the encoder or to
  // `Blob.InlineData`'s schema (whose `jsonSchema` annotation renders it as base64) cannot silently
  // turn every attachment into character ops.
  test('bytes are stored as one native binary scalar, not a text CRDT', async ({ expect }) => {
    await using peer = await builder.createPeer({ types: [Blob.Blob] });
    const db = await peer.createDatabase();

    // Deliberately under `STRING_CRDT_LIMIT`: a base64 encoding of this would sit below the RawString
    // cutoff and so would be the expensive case, which is what makes it worth asserting.
    const payload = 64 * 1024;
    const bytes = new Uint8Array(payload).fill(0x41);

    const blob = await Effect.gen(function* () {
      const blob = yield* Blob.fromBytes(bytes, { type: 'application/octet-stream' });
      yield* Database.add(blob);
      return blob;
    }).pipe(Effect.provide(Database.layer(db)), EffectEx.runAndForwardErrors);

    await db.flush();

    expect(blob.data._tag).toBe('inline');

    const structure = getObjectCore(blob).getObjectStructure();
    const leaves = leafTypes(structure);
    expect(leaves).toContain(`Uint8Array(${payload})`);
    expect(leaves.filter((leaf) => leaf.startsWith('string('))).toEqual([]);
    expect(leaves.filter((leaf) => /RawString|Text/.test(leaf))).toEqual([]);
  });
});
