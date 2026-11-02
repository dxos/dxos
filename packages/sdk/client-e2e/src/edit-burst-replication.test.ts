//
// Copyright 2026 DXOS.org
//

// Benchmark for replicating a burst of small edits: one object, `EDIT_BURST_EDITS` single-character
// edits by one client, and how long every other client of the space takes to hold all of them. Each
// edit is its own change, as typing makes one per keystroke. Opt in with DX_RUN_MANUAL_TESTS=1.
//
//   DX_RUN_MANUAL_TESTS=1 moon run client-e2e:test --force -- src/edit-burst-replication.test.ts
//   EDIT_BURST_PEERS=8 EDIT_BURST_EDITS=400 DX_PROFILE_TESTS=1 DX_RUN_MANUAL_TESTS=1 moon run client-e2e:test --force -- src/edit-burst-replication.test.ts

import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Client } from '@dxos/client';
import { performInvitation } from '@dxos/client-services/testing';
import { TestBuilder, waitForSpace } from '@dxos/client/testing';
import { Filter, Obj, Query, Text } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { log } from '@dxos/log';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { range } from '@dxos/util';

const PEERS = Number(process.env.EDIT_BURST_PEERS ?? 4);
const EDITS = Number(process.env.EDIT_BURST_EDITS ?? 200);
/** Peers editing at once, each appending to its own field. */
const WRITERS = Number(process.env.EDIT_BURST_WRITERS ?? 1);
/** Characters each field starts with, since indexing and sync costs can grow with the document. */
const PREFILL = Number(process.env.EDIT_BURST_PREFILL ?? 0);
/** Gap between edits; 25 ms is a typist at 40 characters a second. */
const EDIT_INTERVAL_MS = Number(process.env.EDIT_BURST_INTERVAL_MS ?? 25);

describe('edit burst replication', { timeout: 600_000, tags: ['manual'] }, () => {
  test('every peer holds a burst of single-character edits soon after it ends', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());

    const clients = await Promise.all(
      range(PEERS, async (index) => {
        const client = new Client({ services: testBuilder.createLocalClientServices() });
        onTestFinished(() => client.destroy());
        await client.initialize();
        await client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: `peer-${index}` }));
        await client.addTypes([TestSchema.Expando]);
        return client;
      }),
    );

    const [host, ...guests] = clients;
    const space = await host.spaces.create({ name: 'burst' });
    await space.waitUntilReady();
    const prefill = 'x'.repeat(PREFILL);
    const fields = range(WRITERS, (writer) => `text${writer}`);
    const object = space.db.add(
      Obj.make(TestSchema.Expando, Object.fromEntries(fields.map((field) => [field, prefill]))),
    );
    await space.db.flush();

    const joinStart = performance.now();
    for (const guest of guests) {
      await Promise.all(performInvitation({ host: space, guest: guest.spaces }));
    }
    const replicas = await Promise.all(
      guests.map(async (guest) => {
        const joined = await waitForSpace(guest, space.key, { ready: true, timeout: 120_000 });
        for (;;) {
          const [replica] = await joined.db.query(Query.select(Filter.type(TestSchema.Expando))).run();
          if (replica) {
            return replica;
          }
          await sleep(50);
        }
      }),
    );
    log.info('joined', { peers: PEERS, ms: Math.round(performance.now() - joinStart) });

    // Each writer edits through its own client's replica, as people typing in their own apps do.
    const writers = [object, ...replicas].slice(0, WRITERS);
    const length = (replica: typeof object) =>
      fields.reduce((sum, field) => sum + String(replica[field] ?? '').length, 0);
    const total = fields.length * (PREFILL + EDITS);
    const editStart = performance.now();
    await Promise.all(
      writers.map(async (writer, index) => {
        for (const edit of range(EDITS)) {
          // A CRDT splice at the end, as the editor makes for each keystroke.
          Obj.update(writer, (writer) => {
            const field = fields[index];
            Text.splice(writer, field, String(writer[field] ?? '').length, 0, String.fromCharCode(97 + (edit % 26)));
          });
          await sleep(EDIT_INTERVAL_MS);
        }
      }),
    );
    const editedAt = performance.now();

    // How long after the burst ends each peer takes to hold all of it, and how far behind it was then.
    const everyone = [object, ...replicas];
    const behindAtEnd = everyone.map((replica) => total - length(replica));
    const caughtUp = await Promise.all(
      everyone.map(async (replica) => {
        while (length(replica) < total) {
          await sleep(20);
        }
        return Math.round(performance.now() - editedAt);
      }),
    );
    const editMs = editedAt - editStart;
    const report = {
      peers: PEERS,
      writers: WRITERS,
      prefill: PREFILL,
      edits: EDITS * WRITERS,
      editMs: Math.round(editMs),
      behindAtEnd,
      caughtUpMs: caughtUp,
      changesPerSecond: Math.round(((EDITS * WRITERS) / (editMs + Math.max(...caughtUp))) * 1_000),
    };
    log.info('burst replicated', report);
    console.log(JSON.stringify(report));
    expect(everyone.every((replica) => fields.every((field) => replica[field] === object[field]))).toBe(true);
  });
});
