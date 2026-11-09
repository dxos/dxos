//
// Copyright 2026 DXOS.org
//

// Runs INSIDE the Cloudflare Workers runtime via `@cloudflare/vitest-pool-workers`, opted in with
// `workerd` in this package's vite config. That is the point rather than a detail: what is under
// test is the record cap, and the cap is read off the object's own SQLite and enforced per
// transport. A fake would be asserting against a reimplementation of the thing that was wrong.

import { env } from 'cloudflare:test';
import { beforeEach, describe, expect, test } from 'vitest';

import type { SyncRecord, SyncRequest, SyncResponse } from '../protocol.ts';
import { MAX_RECORDS, type SpaceEnv, type SpaceObject } from './space-object.ts';

// `cloudflare:test` types `env` as `Cloudflare.Env`, which the runtime leaves empty for a project to
// extend: this is how the pool's `env` learns about the binding this package's vite config declares.
declare global {
  namespace Cloudflare {
    interface Env extends SpaceEnv {}
  }
}

const TYPENAME = 'com.example.type.thing';

const record = (key: string, deleted = false): SyncRecord => ({
  key,
  typename: TYPENAME,
  props: { name: key },
  refs: {},
  ...(deleted ? { deleted: true } : {}),
});

/** A fresh object per test: `idFromName` is deterministic, so the name has to carry the test apart. */
let stub: DurableObjectStub<SpaceObject>;
let next = 0;

beforeEach(() => {
  stub = env.SPACE.get(env.SPACE.idFromName(`space-${++next}`));
});

const post = (request: SyncRequest): Promise<Response> =>
  stub.fetch('https://space/api/space/test/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(request),
  });

/** Everything the store holds, live and tombstoned. */
const read = async (): Promise<SyncResponse> => {
  const response = await post({ since: 0, records: [] });
  expect(response.status).toBe(200);
  return (await response.json()) as SyncResponse;
};

const live = async (): Promise<string[]> =>
  (await read()).records.filter((record) => !record.deleted).map((record) => record.key);

/** Opens a socket to the object and resolves once it has answered `count` messages. */
const socket = async (): Promise<{
  send: (message: unknown) => void;
  next: () => Promise<{ type: string } & Partial<SyncResponse>>;
}> => {
  const response = await stub.fetch('https://space/api/space/test/socket', { headers: { upgrade: 'websocket' } });
  const ws = response.webSocket;
  expect(ws).toBeDefined();
  ws!.accept();
  const queue: ({ type: string } & Partial<SyncResponse>)[] = [];
  const waiting: ((message: { type: string } & Partial<SyncResponse>) => void)[] = [];
  ws!.addEventListener('message', (event: MessageEvent) => {
    const message = JSON.parse(String(event.data));
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

describe('SpaceObject record cap', () => {
  test('a batch past the cap is refused', async () => {
    const records = Array.from({ length: MAX_RECORDS + 1 }, (_unused, index) => record(`key-${index}`));
    const response = await post({ since: 0, records });
    expect(response.status).toBe(413);
    expect(await live()).toEqual([]);
  });

  test('at the cap, a batch that deletes one and creates another is accepted', async () => {
    await fill(MAX_RECORDS);

    // The case the cap used to refuse: the graph does not grow, so there is nothing to refuse.
    const response = await post({ since: 0, records: [record('key-0', true), record('fresh')] });
    expect(response.status).toBe(200);

    const keys = await live();
    expect(keys).toHaveLength(MAX_RECORDS);
    expect(keys).toContain('fresh');
    expect(keys).not.toContain('key-0');
  });

  test('at the cap, one more object is still refused', async () => {
    await fill(MAX_RECORDS);

    const response = await post({ since: 0, records: [record('fresh')] });
    expect(response.status).toBe(413);
    expect(await live()).not.toContain('fresh');
  });

  test('at the cap, editing an object that is already there is accepted', async () => {
    await fill(MAX_RECORDS);

    const response = await post({ since: 0, records: [{ ...record('key-0'), props: { name: 'edited' } }] });
    expect(response.status).toBe(200);
    expect((await read()).records.find((record) => record.key === 'key-0')?.props).toEqual({ name: 'edited' });
  });

  test('a key deleted and written again in one batch ends up live, and counts', async () => {
    await fill(MAX_RECORDS);

    // Order decides the outcome, so the cap has to replay the batch rather than count its keys.
    expect((await post({ since: 0, records: [record('key-0', true), record('key-0')] })).status).toBe(200);
    expect(await live()).toContain('key-0');

    // Which means the graph is still full: the delete did not make room.
    expect((await post({ since: 0, records: [record('fresh')] })).status).toBe(413);
  });

  test('the socket enforces the same cap, and allows the same swap', async () => {
    await fill(MAX_RECORDS);
    const connection = await socket();

    connection.send({ type: 'hello', since: MAX_RECORDS });
    expect((await connection.next()).type).toBe('records');

    connection.send({ type: 'push', records: [record('fresh')] });
    expect(await connection.next()).toMatchObject({ type: 'error' });

    connection.send({ type: 'push', records: [record('key-0', true), record('fresh')] });
    const broadcast = await connection.next();
    expect(broadcast.type).toBe('records');
    expect(broadcast.records?.map((record) => record.key)).toEqual(['key-0', 'fresh']);

    const keys = await live();
    expect(keys).toHaveLength(MAX_RECORDS);
    expect(keys).toContain('fresh');
  });

  test('a malformed entry is skipped by the cap exactly as it is by the write', async () => {
    await fill(MAX_RECORDS);

    // No typename, so `#apply` writes nothing: counting it would refuse a batch that adds nothing.
    const response = await post({ since: 0, records: [{ key: 'fresh' } as unknown as SyncRecord] });
    expect(response.status).toBe(200);
    expect(await live()).not.toContain('fresh');
  });
});
