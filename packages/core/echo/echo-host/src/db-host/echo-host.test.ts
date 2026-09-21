//
// Copyright 2026 DXOS.org
//

import { describe, expect, onTestFinished, test, vi } from 'vitest';

import { Context } from '@dxos/context';
import { type DatabaseDirectory, SpaceDocVersion } from '@dxos/echo-protocol';
import { SpaceId } from '@dxos/keys';

import { createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';

const setup = async () => {
  const { runtime, dispose } = createTestSqliteRuntime();
  const host = new EchoHost({ runtime });
  await host.open(Context.default());
  onTestFinished(async () => {
    await host.close();
    await dispose();
  });

  const spaceId = SpaceId.random();
  const saveDoc = async () => {
    await host.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId },
      objects: {},
      links: {},
    });
    await host.flush(Context.default());
  };

  return { host, saveDoc };
};

describe('EchoHost.updateIndexes', () => {
  test('runs a pass only when something was saved since the last one', async () => {
    const { host, saveDoc } = await setup();
    const update = vi.spyOn(host.indexEngine, 'update');

    await saveDoc();
    await host.updateIndexes();
    const passes = update.mock.calls.length;
    expect(passes).toBeGreaterThan(0);

    await host.updateIndexes();
    await host.updateIndexes();
    expect(update.mock.calls.length).toBe(passes);

    await saveDoc();
    await host.updateIndexes();
    expect(update.mock.calls.length).toBeGreaterThan(passes);
  });
});
