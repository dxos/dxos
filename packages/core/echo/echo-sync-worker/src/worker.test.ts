//
// Copyright 2026 DXOS.org
//

import { fileURLToPath } from 'node:url';
import { afterAll, beforeAll, describe, expect, test } from 'vitest';
import { type Unstable_DevWorker, unstable_dev } from 'wrangler';

import { Filter, Obj } from '@dxos/echo';
import { type SqliteDatabase } from '@dxos/echo-sqlite';
import { type SocketTransport, type SpaceSync, connectSocket, socketPath } from '@dxos/echo-sqlite/sync';
import { TestBuilder } from '@dxos/echo-sqlite/testing';
import { TestSchema } from '@dxos/echo/testing';

const TYPES = [TestSchema.Organization, TestSchema.Person];

/**
 * The real worker in local workerd, with its Durable Object on SQLite: what the tests sync through is
 * what deploys.
 */
let worker: Unstable_DevWorker;

beforeAll(async () => {
  worker = await unstable_dev(fileURLToPath(new URL('./worker.ts', import.meta.url)), {
    config: fileURLToPath(new URL('../wrangler.jsonc', import.meta.url)),
    experimental: { disableExperimentalWarning: true },
    logLevel: 'warn',
  });
});

afterAll(async () => {
  await worker?.stop();
});

const transports: SocketTransport[] = [];

const connect = (spaceId: string): SocketTransport => {
  const transport = connectSocket(`ws://${worker.address}:${worker.port}${socketPath(spaceId)}`);
  transports.push(transport);
  return transport;
};

afterAll(() => transports.forEach((transport) => transport.close()));

/** Flushes and waits for every round, a few times over, so an announcement sent meanwhile is acted on. */
const settle = async (...pairs: [SqliteDatabase, SpaceSync][]): Promise<void> => {
  for (let pass = 0; pass < 4; pass++) {
    for (const [db, sync] of pairs) {
      await db.flush();
      await sync.synced();
    }
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
};

describe('sync through the deployed worker', () => {
  test('rejects a socket for an invalid space id', async () => {
    const response = await worker.fetch('/api/space/not-a-space/socket');
    expect(response.status).toBe(400);
  });

  test('two clients converge, including concurrent text edits', async () => {
    await using builder = new TestBuilder();
    const alice = builder.createPeer({ types: TYPES });
    const bob = builder.createPeer({ types: TYPES });

    const dbA = await alice.createDatabase();
    const dbB = await bob.openDatabase(dbA.spaceId);
    const syncA = alice.syncOver(dbA, connect(dbA.spaceId));
    const syncB = bob.syncOver(dbB, connect(dbB.spaceId));

    const org = dbA.add(Obj.make(TestSchema.Organization, { name: 'quick fox' }));
    await expect
      .poll(async () => {
        await settle([dbA, syncA], [dbB, syncB]);
        return (await dbB.query(Filter.type(TestSchema.Organization)).run()).length;
      })
      .toBe(1);
    const [copy] = await dbB.query(Filter.type(TestSchema.Organization)).run();

    Obj.update(org, (org) => {
      org.name = 'the quick fox';
    });
    Obj.update(copy, (copy) => {
      copy.name = 'quick brown fox';
    });

    await expect
      .poll(async () => {
        await settle([dbA, syncA], [dbB, syncB]);
        return [org.name, copy.name];
      })
      .toEqual(['the quick brown fox', 'the quick brown fox']);
  });
});
