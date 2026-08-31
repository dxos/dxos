//
// Copyright 2025 DXOS.org
//

import * as SqliteClient from '@effect/sql-sqlite-node/SqliteClient';
import * as Layer from 'effect/Layer';
import * as ManagedRuntime from 'effect/ManagedRuntime';
import { describe, expect, onTestFinished, test } from 'vitest';

import { RuntimeProvider } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import { SqlTransaction } from '@dxos/sql-sqlite';
import { bufferToArray } from '@dxos/util';

import { SqliteHeadsStore } from './sqlite-heads-store';
import { SqliteStorageAdapter, decodeKey, encodeKey } from './sqlite-storage-adapter';

const makeTestLayer = () => {
  const baseLayer = SqliteClient.layer({ filename: ':memory:' });
  const txLayer = SqlTransaction.layer.pipe(Layer.provide(baseLayer));
  const rt = ManagedRuntime.make(Layer.merge(baseLayer, txLayer).pipe(Layer.orDie));
  return { runtime: rt.contextEffect, dispose: () => rt.dispose() };
};

describe('encodeKey / decodeKey', () => {
  test('round-trips simple keys', () => {
    const key = ['abc', 'def', 'ghi'];
    expect(decodeKey(encodeKey(key))).toEqual(key);
  });

  test('encodes dashes in segments', () => {
    const key = ['a-b', 'c-d'];
    const encoded = encodeKey(key);
    expect(encoded).toBe('a%2Db-c%2Dd');
    expect(decodeKey(encoded)).toEqual(key);
  });

  test('encodes percent signs in segments', () => {
    const key = ['a%b', 'c'];
    const encoded = encodeKey(key);
    expect(encoded).toBe('a%25b-c');
    expect(decodeKey(encoded)).toEqual(key);
  });
});

describe('SqliteStorageAdapter', () => {
  const setup = async () => {
    const { runtime, dispose } = makeTestLayer();
    const adapter = new SqliteStorageAdapter({ runtime });
    await adapter.open?.();
    await RuntimeProvider.runPromise(runtime)(adapter.migrate);
    onTestFinished(async () => {
      await adapter.close?.();
      await dispose();
    });
    return adapter;
  };

  const chunks = [
    { key: ['a', 'b', 'c', '1'], data: PublicKey.random().asUint8Array() },
    { key: ['a', 'b', 'c', '2'], data: PublicKey.random().asUint8Array() },
    { key: ['a', 'b', 'd', '3'], data: PublicKey.random().asUint8Array() },
    { key: ['a', 'b', 'd', '4'], data: PublicKey.random().asUint8Array() },
  ];

  test('should store and retrieve data', async () => {
    const adapter = await setup();
    await adapter.save(chunks[0].key, chunks[0].data);
    expect(await adapter.load(chunks[0].key)).toEqual(chunks[0].data);
  });

  test('load returns undefined for missing keys', async () => {
    const adapter = await setup();
    expect(await adapter.load(['nonexistent'])).toBeUndefined();
  });

  test('loadRange returns chunks with correct prefixes', async () => {
    const adapter = await setup();
    for (const chunk of chunks) {
      await adapter.save(chunk.key, chunk.data);
    }
    expect((await adapter.loadRange(['a', 'b'])).length).toBe(4);
    expect((await adapter.loadRange(['a', 'b', 'c'])).length).toBe(2);
    expect((await adapter.loadRange(['a', 'b', 'c']))[0]).toEqual(chunks[0]);
  });

  test('remove works', async () => {
    const adapter = await setup();
    for (const chunk of chunks) {
      await adapter.save(chunk.key, chunk.data);
    }
    await adapter.remove(['a', 'b', 'c', '1']);
    expect((await adapter.loadRange(['a', 'b'])).length).toBe(3);
  });

  test('removeRange works', async () => {
    const adapter = await setup();
    for (const chunk of chunks) {
      await adapter.save(chunk.key, chunk.data);
    }
    await adapter.removeRange(['a', 'b', 'd']);
    expect((await adapter.loadRange(['a', 'b'])).length).toBe(2);
    expect((await adapter.loadRange(['a', 'b', 'd'])).length).toBe(0);
  });

  test('saveBatch atomically saves multiple entries', async () => {
    const adapter = await setup();
    await adapter.saveBatch([
      [chunks[0].key, chunks[0].data],
      [chunks[1].key, chunks[1].data],
    ]);
    expect(await adapter.load(chunks[0].key)).toEqual(chunks[0].data);
    expect(await adapter.load(chunks[1].key)).toEqual(chunks[1].data);
  });

  test('loadRange returns keys in sorted order', async () => {
    const adapter = await setup();
    await adapter.save(['test', '2'], bufferToArray(Buffer.from('two')));
    await adapter.save(['test', '1'], bufferToArray(Buffer.from('one')));
    await adapter.save(['bar', '1'], bufferToArray(Buffer.from('bar')));
    const range = await adapter.loadRange(['test']);
    expect(range.map((c) => Buffer.from(c.data!).toString())).toEqual(['one', 'two']);
    expect(range.map((c) => c.key)).toEqual([
      ['test', '1'],
      ['test', '2'],
    ]);
  });

  // The range bounds are anchored on the separator, so a prefix selects whole segments only. A
  // bounds anchored on the prefix itself would degrade to a raw string-prefix match and return these
  // siblings — a different document's chunks. The key layout is protocol, so pin the boundary.
  test('loadRange matches whole segments, not string prefixes', async () => {
    const adapter = await setup();
    const target = ['sub', 'doc1'];
    const siblings = [
      ['sub', 'doc1X'], // segment merely starts with the same text
      ['sub', 'doc12'], // digit continuation, sorts above the separator
      ['sub', 'doc1!'], // '!' (0x21) sorts below the separator
      ['sub', 'doc2'], // unrelated segment
    ];
    await adapter.save([...target, 'chunk'], bufferToArray(Buffer.from('wanted')));
    for (const sibling of siblings) {
      await adapter.save([...sibling, 'chunk'], bufferToArray(Buffer.from(sibling.join('/'))));
    }

    const range = await adapter.loadRange(target);
    expect(range.map((chunk) => chunk.key)).toEqual([[...target, 'chunk']]);
  });

  // `loadRange` must also return a key stored at exactly the queried prefix — the production
  // `subduction-ids-<sid>` records are shaped that way, and dropping the equality branch in favour of
  // a pure descendant range would silently stop finding them.
  test('loadRange includes a key stored at exactly the prefix', async () => {
    const adapter = await setup();
    await adapter.save(['sub', 'ids'], bufferToArray(Buffer.from('exact')));
    await adapter.save(['sub', 'ids', 'child'], bufferToArray(Buffer.from('child')));

    const range = await adapter.loadRange(['sub', 'ids']);
    expect(range.map((chunk) => chunk.key)).toEqual([
      ['sub', 'ids'],
      ['sub', 'ids', 'child'],
    ]);
    expect(range.map((chunk) => Buffer.from(chunk.data!).toString())).toEqual(['exact', 'child']);
  });

  test('loadRange handles an empty trailing segment', async () => {
    const adapter = await setup();
    await adapter.save(['sub', 'doc', ''], bufferToArray(Buffer.from('empty')));
    expect((await adapter.loadRange(['sub', 'doc'])).map((chunk) => chunk.key)).toEqual([['sub', 'doc', '']]);
  });

  test('removeRange deletes whole segments only, including the exact prefix', async () => {
    const adapter = await setup();
    await adapter.save(['sub', 'doc1'], bufferToArray(Buffer.from('exact')));
    await adapter.save(['sub', 'doc1', 'chunk'], bufferToArray(Buffer.from('child')));
    await adapter.save(['sub', 'doc1X', 'chunk'], bufferToArray(Buffer.from('sibling')));

    await adapter.removeRange(['sub', 'doc1']);
    expect(await adapter.loadRange(['sub', 'doc1'])).toEqual([]);
    expect((await adapter.loadRange(['sub', 'doc1X'])).length).toBe(1);
  });
});

describe('SqliteHeadsStore', () => {
  const setup = async () => {
    const { runtime, dispose } = makeTestLayer();
    const store = new SqliteHeadsStore({ runtime });
    await RuntimeProvider.runPromise(runtime)(store.migrate);
    onTestFinished(() => dispose());
    return { store, runtime };
  };

  test('setHeads and getHeads round-trip', async () => {
    const { store, runtime } = await setup();
    const docId = 'abc123' as any;
    const heads = ['hash1', 'hash2'];
    await RuntimeProvider.runPromise(runtime)(store.setHeads(docId, heads));
    const result = await store.getHeads([docId]);
    expect(result[0]).toEqual(heads);
  });

  test('getHeads returns undefined for missing docs', async () => {
    const { store } = await setup();
    const result = await store.getHeads(['missing' as any]);
    expect(result[0]).toBeUndefined();
  });

  test('getHeads handles empty array', async () => {
    const { store } = await setup();
    expect(await store.getHeads([])).toEqual([]);
  });

  test('iterateAll yields stored heads', async () => {
    const { store, runtime } = await setup();
    const docId1 = 'doc1' as any;
    const docId2 = 'doc2' as any;
    await RuntimeProvider.runPromise(runtime)(store.setHeads(docId1, ['h1']));
    await RuntimeProvider.runPromise(runtime)(store.setHeads(docId2, ['h2']));
    const all: any[] = [];
    for await (const entry of store.iterateAll()) {
      all.push(entry);
    }
    expect(all.length).toBe(2);
  });
});
