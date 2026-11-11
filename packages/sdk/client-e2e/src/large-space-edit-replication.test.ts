//
// Copyright 2026 DXOS.org
//

import { create } from '@bufbuild/protobuf';
import { describe, expect, onTestFinished, test } from 'vitest';

import { sleep } from '@dxos/async';
import { Client } from '@dxos/client';
import { performInvitation } from '@dxos/client-services/testing';
import { TestBuilder, waitForSpace } from '@dxos/client/testing';
import { Filter, Obj, Query } from '@dxos/echo';
import { TestSchema } from '@dxos/echo/testing';
import { ProfileDocumentSchema } from '@dxos/protocols/buf/dxos/halo/credentials_pb';
import { range } from '@dxos/util';

/** More documents than the host keeps idle, so the host evicts documents it is still syncing. */
const OBJECTS = 120;

/** Well under the collection poll (5 s), so an edit the live sync dropped cannot pass on the poll. */
const MAX_EDIT_LATENCY_MS = 1_000;

describe('large space edit replication', { timeout: 120_000 }, () => {
  test('each edit reaches the other peer without waiting for the collection poll', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const [alice, bob] = await Promise.all(
      range(2, async (index) => {
        const client = new Client({ services: testBuilder.createLocalClientServices() });
        onTestFinished(() => client.destroy());
        await client.initialize();
        await client.halo.createIdentity(create(ProfileDocumentSchema, { displayName: `peer-${index}` }));
        await client.addTypes([TestSchema.Expando]);
        return client;
      }),
    );

    const space = await alice.spaces.create();
    await space.waitUntilReady();
    const target = space.db.add(Obj.make(TestSchema.Expando, { text: '' }));
    for (const index of range(OBJECTS)) {
      space.db.add(Obj.make(TestSchema.Expando, { index }));
    }
    await space.db.flush();

    await Promise.all(performInvitation({ host: space, guest: bob.spaces }));
    const joined = await waitForSpace(bob, space.key, { ready: true, timeout: 60_000 });
    let replica: any;
    await expect
      .poll(
        async () => {
          const objects = await joined.db.query(Query.select(Filter.type(TestSchema.Expando))).run();
          replica = objects.find((object) => object.id === target.id);
          return objects.length;
        },
        { timeout: 60_000 },
      )
      .toEqual(OBJECTS + 1);

    for (const char of ['a', 'b', 'c', 'd', 'e']) {
      Obj.update(target, (target) => {
        target.text = `${target.text}${char}`;
      });
      await expect.poll(() => replica.text, { timeout: MAX_EDIT_LATENCY_MS, interval: 10 }).toContain(char);
      await sleep(300);
    }
  });
});
