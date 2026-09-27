//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { sleep } from '@dxos/async';
import { Context } from '@dxos/context';
import { type DatabaseDirectory, EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { RuntimeProvider } from '@dxos/effect';
import { DXN, EntityId, SpaceId } from '@dxos/keys';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';

describe('EchoHost.updateIndexes', () => {
  test('runs a pass only when something was saved since the last one', async () => {
    const { host, saveDocs } = await setup();
    const update = vi.spyOn(host.indexEngine, 'update');

    await saveDocs();
    await host.updateIndexes();
    const passes = update.mock.calls.length;
    expect(passes).toBeGreaterThan(0);

    await host.updateIndexes();
    await host.updateIndexes();
    expect(update.mock.calls.length).toBe(passes);

    await saveDocs();
    await host.updateIndexes();
    expect(update.mock.calls.length).toBeGreaterThan(passes);
  });

  // A streaming agent reply writes faster than a pass completes, so no pass ever finds an empty
  // batch; waiting for one hung every feed-scoped one-shot query issued mid-stream until it timed out.
  test('returns once the writes made before the call are indexed, while writes keep arriving', async () => {
    const { host, runtime, spaceId, saveObject } = await setup();
    const update = host.indexEngine.update.bind(host.indexEngine);
    // Slowed so every pass overlaps a write: the stream never leaves an empty batch behind it.
    vi.spyOn(host.indexEngine, 'update').mockImplementation((ctx, source, opts) =>
      Effect.delay(update(ctx, source, opts), '20 millis'),
    );

    let streaming = true;
    const stream = (async () => {
      while (streaming) {
        await saveObject(EntityId.random());
        await sleep(5);
      }
    })();
    onTestFinished(async () => {
      streaming = false;
      await stream;
    });
    await sleep(100);

    const written = EntityId.random();
    await saveObject(written);
    const outcome = await Promise.race([
      host.updateIndexes().then(() => 'indexed' as const),
      sleep(5_000).then(() => 'stalled' as const),
    ]);
    streaming = false;
    await stream;

    expect(outcome).toBe('indexed');
    const rows = await RuntimeProvider.runPromise(runtime)(
      host.indexEngine.queryObjectIds({ spaceIds: [spaceId], objectIds: [written] }),
    );
    expect(rows.map((row) => row.objectId)).toEqual([written]);
  });
});

const TEST_TYPE = DXN.make('com.example.type.test', '0.1.0');

const setup = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new EchoHost({ runtime });
  await host.open(Context.default());
  onTestFinished(async () => {
    await host.close();
    await dispose();
  });

  const spaceId = SpaceId.random();
  const saveDocs = async (count = 1) => {
    for (let i = 0; i < count; i++) {
      await host.createDoc<DatabaseDirectory>({
        version: SpaceDocVersion.CURRENT,
        access: { spaceId },
        objects: {},
        links: {},
      });
    }
    await host.flush(Context.default());
  };

  // One document per object, as a stream of writes would produce: each save is a new index input.
  const saveObject = async (objectId: EntityId) => {
    await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: { [objectId]: EntityStructure.makeObject({ type: TEST_TYPE, data: { title: objectId } }) },
      links: {},
    });
    await host.flush(Context.default());
  };

  return { host, runtime, spaceId, saveDocs, saveObject };
};
