//
// Copyright 2023 DXOS.org
//

import { type Context, cancelWithContext } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { schema } from '@dxos/protocols';
import { BlobMeta } from '@dxos/protocols/proto/dxos/echo/blob';
import { type SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { type BlobStore, type BlobSync } from '@dxos/teleport-extension-object-sync';

import { type SnapshotStore } from './snapshot-store';

const SpaceSnapshot = schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot');

/**
 * Snapshot manager for a specific space.
 */
export class SnapshotManager {
  constructor(
    private readonly _snapshotStore: SnapshotStore,
    private readonly _blobStore: BlobStore,
    private readonly _blobSync: BlobSync,
  ) {}

  private async _getBlob(blobId: Uint8Array): Promise<SpaceSnapshot> {
    const blob = await this._blobStore.get(blobId);
    return SpaceSnapshot.decode(blob);
  }

  async load(ctx: Context, id: string): Promise<SpaceSnapshot> {
    const blobId = PublicKey.fromHex(id).asUint8Array();
    const blobMeta = await this._blobStore.getMeta(blobId);
    if (blobMeta && blobMeta.state === BlobMeta.State.FULLY_PRESENT) {
      return this._getBlob(blobId);
    }

    // TODO(dmaretskyi): Remove once we fully migrate to blob store.
    const fallbackStore = await cancelWithContext(ctx, this._snapshotStore.loadSnapshot(id));
    if (fallbackStore) {
      return fallbackStore;
    }

    await this._blobSync.download(ctx, blobId);

    return this._getBlob(blobId);
  }

  async store(snapshot: SpaceSnapshot): Promise<string> {
    const { id } = await this._blobStore.set(SpaceSnapshot.encode(snapshot));
    await this._blobSync.notifyBlobAdded(id);
    return PublicKey.from(id).toHex();
  }
}
