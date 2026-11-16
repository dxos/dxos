//
// Copyright 2026 DXOS.org
//

// Runs INSIDE the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers`, opted in with
// `workerd` in this package's vite config. What is under test — compare-and-set on seqs, the record
// cap, expiry — is read off the object's own SQLite, so a fake would be asserting against a
// reimplementation of the thing under test.

import { env, runDurableObjectAlarm } from 'cloudflare:test';
import { beforeEach, describe, expect, test } from 'vitest';

import {
  MAX_RECORDS,
  type PushRecord,
  type PushRequest,
  type PushResult,
  type ServerMessage,
  type SpaceEnv,
  type SpaceObject,
} from '@dxos/echo-sync-worker';

// `cloudflare:test` types `env` as `Cloudflare.Env`, which the runtime leaves empty for a project to
// extend: this is how the pool's `env` learns about the binding this package's vite config declares.
declare global {
  namespace Cloudflare {
    interface Env extends SpaceEnv {}
  }
}

const TYPENAME = 'com.example.type.thing';

const record = (
  key: string,
  { deleted = false, name = key, base }: { deleted?: boolean; name?: string; base?: number } = {},
): PushRecord => ({
  key,
  typename: TYPENAME,
  props: { name },
  refs: {},
  ...(deleted ? { deleted: true } : {}),
  ...(base !== undefined ? { base } : {}),
});

/** A fresh object per test: `idFromName` is deterministic, so the name has to carry the test apart. */
let stub: DurableObjectStub<SpaceObject>;
let next = 0;

beforeEach(() => {
  stub = env.SPACE.get(env.SPACE.idFromName(`space-${++next}`));
});

const post = (request: PushRequest): Promise<Response> =>
  stub.fetch('https://space/api/space/test/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });

const push = async (request: PushRequest): Promise<PushResult> => {
  const response = await post(request);
  expect(response.status).toBe(200);
  return (await response.json()) as PushResult;
};

/** Everything the store holds, live and tombstoned. */
const read = (): Promise<PushResult> => push({ since: 0, records: [] });

const live = async (): Promise<string[]> =>
  (await read()).records.filter((record) => !record.deleted).map((record) => record.key);

const seqOf = async (key: string): Promise<number | undefined> =>
  (await read()).records.find((record) => record.key === key)?.seq;

type Socket = { send: (message: unknown) => void; next: () => Promise<ServerMessage> };

/** Opens a socket to the object; `next` resolves with each message in order. */
const socket = async (): Promise<Socket> => {
  const response = await stub.fetch('https://space/api/space/test/socket', { headers: { upgrade: 'websocket' } });
  const ws = response.webSocket;
  expect(ws).toBeDefined();
  ws!.accept();
  const queue: ServerMessage[] = [];
  const waiting: ((message: ServerMessage) => void)[] = [];
  ws!.addEventListener('message', (event: MessageEvent) => {
    const message = JSON.parse(String(event.data)) as ServerMessage;
    const resolve = waiting.shift();
    resolve ? resolve(message) : queue.push(message);
  });
  return {
    send: (message: unknown) => ws!.send(JSON.stringify(message)),
    next: () => {
      const queued = queue.shift();
      return queued ? Promise.resolve(queued) : new Promise((resolve) => waiting.push(resolve));
    },
  };
};

/** Fills the store to the cap, in batches the runtime will accept in one transaction. */
const fill = async (count: number): Promise<void> => {
  const size = 250;
  for (let from = 0; from < count; from += size) {
    const records = Array.from({ length: Math.min(size, count - from) }, (_unused, index) =>
      record(`key-${from + index}`),
    );
    expect((await post({ since: 0, records })).status).toBe(200);
  }
  expect(await live()).toHaveLength(count);
};

describe('SpaceObject sequencing', () => {
  test('every accepted write gets the next seq', async () => {
    const result = await push({ since: 0, records: [record('a', { base: 0 }), record('b', { base: 0 })] });
    expect(result.accepted).toBe(true);
    expect(result.seq).toBe(2);
    expect(result.records.map((entry) => [entry.key, entry.seq])).toEqual([
      ['a', 1],
      ['b', 2],
    ]);
  });

  test('a push based on the current seq is applied', async () => {
    await push({ since: 0, records: [record('a', { base: 0 })] });
    const result = await push({ since: 1, records: [record('a', { name: 'edited', base: 1 })] });
    expect(result.accepted).toBe(true);
    expect(result.records).toEqual([expect.objectContaining({ key: 'a', seq: 2, props: { name: 'edited' } })]);
  });

  test('a push based on a stale seq is refused whole, and answered with what was missed', async () => {
    await push({ since: 0, records: [record('a', { base: 0 }), record('b', { base: 0 })] });
    // Another client moves `a` on.
    await push({ since: 2, records: [record('a', { name: 'theirs', base: 1 })] });

    const result = await push({
      since: 2,
      records: [record('a', { name: 'mine', base: 1 }), record('b', { name: 'mine', base: 2 })],
    });
    expect(result.accepted).toBe(false);
    expect(result.conflicts).toEqual(['a']);
    expect(result.records).toEqual([expect.objectContaining({ key: 'a', seq: 3, props: { name: 'theirs' } })]);
    // All or nothing: `b` was current, but it is not applied either.
    expect((await read()).records.find((entry) => entry.key === 'b')?.props).toEqual({ name: 'b' });

    // Merged on top of what it missed, the same push goes through.
    const retry = await push({
      since: 3,
      records: [record('a', { name: 'mine', base: 3 }), record('b', { name: 'mine', base: 2 })],
    });
    expect(retry.accepted).toBe(true);
    expect(await seqOf('a')).toBe(4);
  });

  test('a new record whose key the store already holds is a conflict', async () => {
    await push({ since: 0, records: [record('a', { base: 0 })] });
    const result = await push({ since: 0, records: [record('a', { name: 'again', base: 0 })] });
    expect(result.accepted).toBe(false);
    expect(result.conflicts).toEqual(['a']);
  });

  test('a record without a base is written unconditionally', async () => {
    await push({ since: 0, records: [record('a', { base: 0 })] });
    const result = await push({ since: 1, records: [record('a', { name: 'forced' })] });
    expect(result.accepted).toBe(true);
  });

  test('a retried push is applied once', async () => {
    const request = { client: 'c1', clientSeq: 1, since: 0, records: [record('a', { base: 0 })] };
    expect((await push(request)).accepted).toBe(true);
    // Its answer was lost; the retry carries the same clientSeq and a base that is no longer current.
    const retry = await push(request);
    expect(retry.accepted).toBe(true);
    expect(retry.seq).toBe(1);
  });

  test('the pusher gets an ack; every other socket gets the records', async () => {
    const mine = await socket();
    const theirs = await socket();

    mine.send({ type: 'push', client: 'c1', clientSeq: 1, since: 0, records: [record('a', { base: 0 })] });
    const ack = await mine.next();
    expect(ack).toMatchObject({ type: 'ack', clientSeq: 1, accepted: true, seq: 1 });

    const broadcast = await theirs.next();
    expect(broadcast).toMatchObject({ type: 'records', from: 0, seq: 1 });
    expect(broadcast.type === 'records' && broadcast.records.map((entry) => entry.key)).toEqual(['a']);

    theirs.send({ type: 'pull', since: 0 });
    expect(await theirs.next()).toMatchObject({ type: 'records', from: 0, seq: 1 });
  });
});

describe('SpaceObject record cap', () => {
  test('a batch past the cap is refused', async () => {
    const records = Array.from({ length: MAX_RECORDS + 1 }, (_unused, index) => record(`key-${index}`));
    const response = await post({ since: 0, records });
    expect(response.status).toBe(413);
    expect(await live()).toEqual([]);
  });

  test('at the cap, a batch that deletes one and creates another is accepted', async () => {
    await fill(MAX_RECORDS);
    const response = await post({ since: 0, records: [record('key-0', { deleted: true }), record('fresh')] });
    expect(response.status).toBe(200);

    const keys = await live();
    expect(keys).toHaveLength(MAX_RECORDS);
    expect(keys).toContain('fresh');
    expect(keys).not.toContain('key-0');
  });

  test('at the cap, one more object is still refused', async () => {
    await fill(MAX_RECORDS);
    expect((await post({ since: 0, records: [record('fresh')] })).status).toBe(413);
    expect(await live()).not.toContain('fresh');
  });

  test('at the cap, editing an object that is already there is accepted', async () => {
    await fill(MAX_RECORDS);
    expect((await post({ since: 0, records: [record('key-0', { name: 'edited' })] })).status).toBe(200);
    expect((await read()).records.find((entry) => entry.key === 'key-0')?.props).toEqual({ name: 'edited' });
  });

  test('a key deleted and written again in one batch ends up live, and counts', async () => {
    await fill(MAX_RECORDS);
    expect((await post({ since: 0, records: [record('key-0', { deleted: true }), record('key-0')] })).status).toBe(200);
    expect(await live()).toContain('key-0');
    expect((await post({ since: 0, records: [record('fresh')] })).status).toBe(413);
  });

  test('the socket enforces the same cap', async () => {
    await fill(MAX_RECORDS);
    const connection = await socket();
    connection.send({ type: 'push', since: MAX_RECORDS, records: [record('fresh')] });
    expect(await connection.next()).toMatchObject({ type: 'error' });
  });

  test('a malformed entry is skipped', async () => {
    await fill(MAX_RECORDS);
    const response = await post({ since: 0, records: [{ key: 'fresh' } as unknown as PushRecord] });
    expect(response.status).toBe(200);
    expect(await live()).not.toContain('fresh');
  });
});

describe('SpaceObject expiry', () => {
  test('the store that replaces an expired one is a different incarnation', async () => {
    await push({ since: 0, records: [record('key-0'), record('key-1')] });
    const before = await read();
    expect(before.seq).toBe(2);

    expect(await runDurableObjectAlarm(stub)).toBe(true);

    // A peer that knows nothing of the expiry writes, which climbs the new store back to the seq a
    // returning client saved; only the incarnation tells the two apart.
    await push({ since: 0, records: [record('key-2'), record('key-3')] });
    const after = await read();
    expect(after.seq).toBe(before.seq);
    expect(after.incarnation).not.toBe(before.incarnation);
    expect(after.records.map((entry) => entry.key)).toEqual(['key-2', 'key-3']);
  });
});
