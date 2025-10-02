//
// Copyright 2023 DXOS.org
//

// TODO(wittjosiah): This is preventing this suite from running in browser.
import { randomBytes } from 'node:crypto';

import { describe, expect, onTestFinished, test } from 'vitest';

import { Context } from '@dxos/context';
import { StorageType, createStorage } from '@dxos/random-access-storage';
import { TestBuilder, type TestConnection, TestPeer } from '@dxos/teleport/testing';
import { range } from '@dxos/util';

import { BlobStore, DEFAULT_CHUNK_SIZE } from './blob-store';
import { BlobSync } from './blob-sync';

class TestAgent extends TestPeer {
  storage = createStorage({ type: StorageType.RAM });

  blobStore = new BlobStore(this.storage.createDirectory('blobs'));

  blobSync = new BlobSync({ blobStore: this.blobStore });

  protected override async onOpen(connection: TestConnection): Promise<void> {
    await super.onOpen(connection);
    connection.teleport.addExtension('dxos.mesh.teleport.blobsync', this.blobSync.createExtension());
  }

  override async destroy(): Promise<void> {
    await super.destroy();
    await this.blobSync.close();
  }

  async generateBlob(size = 10_000): Promise<Uint8Array> {
    const { id } = await this.blobStore.set(randomBytes(size));
    return id;
  }
}

describe('BlobSync', () => {
  test('two peers synchronize', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const [peer1, peer2] = await Promise.all(
      range(2).map(() => testBuilder.createPeer({ factory: () => new TestAgent() })),
    );
    await testBuilder.connect(peer1, peer2);

    const id = await peer1.generateBlob();
    expect(await peer2.blobStore.getMeta(id)).toBeUndefined();

    await peer2.blobSync.download(new Context(), id);

    const blob1 = await peer1.blobStore.get(id);
    const blob2 = await peer2.blobStore.get(id);
    expect(Buffer.from(blob1).equals(blob2)).toBeTruthy();
  });

  test('downloading existing chunk completes immediately', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const [peer1, peer2] = await Promise.all(
      range(2).map(() => testBuilder.createPeer({ factory: () => new TestAgent() })),
    );
    await testBuilder.connect(peer1, peer2);

    const id = await peer1.generateBlob();

    await peer1.blobSync.download(new Context(), id);
  });

  test('different blob sizes', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const [peer1, peer2] = await Promise.all(
      range(2).map(() => testBuilder.createPeer({ factory: () => new TestAgent() })),
    );
    await testBuilder.connect(peer1, peer2);

    const sizes = [
      // 0,
      1,
      100,
      DEFAULT_CHUNK_SIZE - 1,
      DEFAULT_CHUNK_SIZE,
      DEFAULT_CHUNK_SIZE + 1,
      10_000,
      100_000,
    ];
    const ids = await Promise.all(sizes.map((size) => peer1.generateBlob(size)));

    await Promise.all(
      ids.map(async (id) => {
        await peer2.blobSync.download(new Context(), id);
      }),
    );

    for (const id of ids) {
      const blob1 = await peer1.blobStore.get(id);
      const blob2 = await peer2.blobStore.get(id);
      expect(Buffer.from(blob1).equals(blob2)).toBeTruthy();
    }
  });

  test('3 peers in a chain', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const [peer1, peer2, peer3] = await Promise.all(
      range(3).map(() => testBuilder.createPeer({ factory: () => new TestAgent() })),
    );
    await testBuilder.connect(peer1, peer2);
    await testBuilder.connect(peer2, peer3);

    const id = await peer1.generateBlob();
    expect(await peer2.blobStore.getMeta(id)).toBeUndefined();

    await Promise.all([peer2.blobSync.download(new Context(), id), peer3.blobSync.download(new Context(), id)]);

    const blob1 = await peer1.blobStore.get(id);
    const blob2 = await peer2.blobStore.get(id);
    const blob3 = await peer3.blobStore.get(id);
    expect(Buffer.from(blob1).equals(blob2)).toBeTruthy();
    expect(Buffer.from(blob1).equals(blob3)).toBeTruthy();
  });

  test('cancel download', async () => {
    const testBuilder = new TestBuilder();
    onTestFinished(() => testBuilder.destroy());
    const [peer1, peer2] = await Promise.all(
      range(2).map(() => testBuilder.createPeer({ factory: () => new TestAgent() })),
    );
    await testBuilder.connect(peer1, peer2);

    const id = await peer1.generateBlob();
    expect(await peer2.blobStore.getMeta(id)).toBeUndefined();

    const ctx = new Context();
    void peer2.blobSync.download(ctx, id).catch(() => {});
    await ctx.dispose();

    const meta = await peer2.blobStore.getMeta(id);
    expect(meta).toBeUndefined();
  });
});
