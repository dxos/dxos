//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { type DatabaseDirectory, EntityStructure, SpaceDocVersion } from '@dxos/echo-protocol';
import { DXN, EntityId, PublicKey, SpaceId } from '@dxos/keys';

import { TestReplicationNetwork, createTestSqliteRuntime } from '../testing/index.ts';
import { EchoHost } from './echo-host.ts';

const TEST_TYPE = DXN.make('com.example.type.test', '0.1.0');

describe('EchoHost.openLocalSpace', () => {
  test('one local space per name', async ({ expect }) => {
    const host = await openHost();
    const [settings, again, concurrent] = await Promise.all([
      host.openLocalSpace(Context.default(), 'settings'),
      host.openLocalSpace(Context.default(), 'settings'),
      host.openLocalSpace(Context.default(), 'settings'),
    ]);
    const drafts = await host.openLocalSpace(Context.default(), 'drafts');

    // Local ids are ordinary space ids; locality is recorded by the host.
    expect(SpaceId.isValid(settings.spaceId)).toBe(true);
    expect(host.isLocalSpace(settings.spaceId)).toBe(true);
    expect(again.root.url).toBe(settings.root.url);
    expect(concurrent.root.url).toBe(settings.root.url);
    expect(drafts.spaceId).not.toBe(settings.spaceId);
    expect(drafts.root.url).not.toBe(settings.root.url);
    expect(host.spaces.map((space) => space.spaceId)).toEqual(
      expect.arrayContaining([settings.spaceId, drafts.spaceId]),
    );
  });

  test('reopens a name with its objects after a restart', async ({ expect }) => {
    const path = `/tmp/dxos-${PublicKey.random().toHex()}.db`;
    const objectId = EntityId.random();

    const [first, disposeFirst] = await openHostWithStorage(path);
    const created = await first.openLocalSpace(Context.default(), 'settings');
    created.root.change((doc: DatabaseDirectory) => {
      doc.objects ??= {};
      doc.objects[objectId] = EntityStructure.makeObject({ type: TEST_TYPE, data: { title: 'kept' } });
    });
    await first.flush(Context.default());
    await first.close();
    await disposeFirst();

    const second = await openHost(path);
    const reopened = await second.openLocalSpace(Context.default(), 'settings');
    expect(reopened.spaceId).toBe(created.spaceId);
    expect(second.isLocalSpace(reopened.spaceId)).toBe(true);
    expect(reopened.root.url).toBe(created.root.url);
    expect(Object.keys(reopened.root.doc()?.objects ?? {})).toEqual([objectId]);
  });

  // The replicators here advertise everything, as an edge connection with its share policy disabled
  // does: the host itself must keep a local space's documents to itself.
  test('never serves a local space to a peer whose policy would allow it', async ({ expect }) => {
    const owner = await openHost();
    const peer = await openHost();
    const local = await owner.openLocalSpace(Context.default(), 'settings');
    using replicated = await owner.createDoc<DatabaseDirectory>({
      version: SpaceDocVersion.CURRENT,
      access: { spaceId: SpaceId.random() },
      objects: {},
      links: {},
    });
    await owner.flush(Context.default());

    const network = await new TestReplicationNetwork().open();
    await owner.addReplicator(Context.default(), await network.createReplicator());
    await peer.addReplicator(Context.default(), await network.createReplicator());

    using control = await peer.loadDoc<DatabaseDirectory>(Context.default(), replicated.url, {
      fetchFromNetwork: true,
      timeout: 5_000,
    });
    expect(control?.doc()?.access?.spaceId).toBe(replicated.doc()?.access?.spaceId);

    const leaked = await peer
      .loadDoc<DatabaseDirectory>(Context.default(), local.root.url, { fetchFromNetwork: true, timeout: 1_500 })
      .catch(() => null);
    expect(leaked?.doc()?.access).toBeUndefined();
    leaked?.[Symbol.dispose]();

    // Replicators disconnect on host close, which needs the network still open.
    await owner.close();
    await peer.close();
    await network.close();
  });
});

const openHost = async (path?: string): Promise<EchoHost> => (await openHostWithStorage(path))[0];

/** The host and a release of its storage, which is idempotent so a test can reopen the same file. */
const openHostWithStorage = async (path?: string): Promise<[EchoHost, () => Promise<void>]> => {
  const storage = createTestSqliteRuntime(path);
  let disposed = false;
  const dispose = async () => {
    if (!disposed) {
      disposed = true;
      await storage.dispose();
    }
  };
  const host = new EchoHost({ runtime: storage.runtime });
  await host.open(Context.default());
  onTestFinished(async () => {
    if (host.isOpen) {
      await host.close();
    }
    await dispose();
  });
  return [host, dispose];
};
