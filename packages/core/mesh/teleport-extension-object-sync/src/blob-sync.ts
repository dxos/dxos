//
// Copyright 2023 DXOS.org
//

import assert from 'assert';

import { trackLeaks, Trigger, Lock } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { BlobMeta } from '@dxos/protocols/proto/dxos/echo/blob';
import { WantList } from '@dxos/protocols/proto/dxos/mesh/teleport/blobsync';
import { BitField } from '@dxos/util';

import { BlobStore } from './blob-store';
import { BlobSyncExtension } from './blob-sync-extension';

export type BlobSyncParams = {
  blobStore: BlobStore;

  /**
   * Legacy fallback while we are migrating from ObjectStore to BlobStore.
   * TODO(mykola): delete once DXOS space process few Epochs.
   * @deprecated
   */
  fallbackGetObject: (id: string) => Promise<Uint8Array | undefined>;
};

type DownloadRequest = {
  trigger: Trigger<void>;
  counter: number;
  want: WantList.Entry;
};

// TODO(dmaretskyi): Rename to blob-sync.
@trackLeaks('open', 'close')
export class BlobSync {
  private readonly _ctx = new Context();
  private readonly _lock = new Lock();

  private readonly _downloadRequests = new Map<string, DownloadRequest>();
  private readonly _extensions = new Set<BlobSyncExtension>();

  constructor(private readonly _params: BlobSyncParams) {}

  async open() {}

  async close() {
    await this._ctx.dispose();
  }

  /**
   * Resolves when the object with the given id is fully downloaded in the blob store.
   *
   * @param id hex-encoded id of the object to download.
   */
  async download(ctx: Context, id: string): Promise<void> {
    log('download', { id });
    const request = await this._lock.executeSynchronized(async () => {
      const existingRequest = this._downloadRequests.get(id);

      if (existingRequest) {
        existingRequest.counter++;
        return existingRequest;
      }

      const decodedId = PublicKey.from(id).asUint8Array();
      const meta = await this._params.blobStore.getMeta(decodedId);
      const request: DownloadRequest = {
        trigger: new Trigger(),
        counter: 1,
        want: {
          id: decodedId,
          chunkSize: meta?.chunkSize,
          bitfield: meta?.bitfield && Uint8Array.from(BitField.invert(meta.bitfield)),
        },
      };

      this._downloadRequests.set(id, request);
      this._updateExtensionsWantList();

      return request;
    });

    ctx?.onDispose(() =>
      this._lock.executeSynchronized(async () => {
        // Remove request if context is disposed and nobody else requests it.
        const request = this._downloadRequests.get(id);
        if (!request) {
          return;
        }
        if (--request.counter === 0) {
          this._downloadRequests.delete(id);
        }
        this._updateExtensionsWantList();
      }),
    );

    return ctx ? cancelWithContext(ctx, request.trigger.wait()) : request.trigger.wait();
  }

  createExtension() {
    const extension = new BlobSyncExtension({
      blobStore: this._params.blobStore,
      onOpen: async () => {
        log('extension opened');
        this._extensions.add(extension);
        extension.updateWantList(this._getWantList());
      },
      onClose: async () => {
        log('extension closed');
        this._extensions.delete(extension);
      },
      onPush: async (blobChunk) => {
        const encodedId = PublicKey.from(blobChunk.id).toHex();
        if (!this._downloadRequests.has(encodedId)) {
          return;
        }
        log('received', { blobChunk });
        const meta = await this._params.blobStore.setChunk(blobChunk);
        if (meta.state === BlobMeta.State.FULLY_PRESENT) {
          this._downloadRequests.get(encodedId)?.trigger.wake();
          this._downloadRequests.delete(encodedId);
          this._updateExtensionsWantList();
        } else {
          assert(meta.bitfield);
          this._downloadRequests.get(encodedId)!.want.bitfield = BitField.invert(meta.bitfield);
          this._updateExtensionsWantList();
        }

        for (const extension of this._extensions) {
          extension.reconcileUploads();
        }
      },
    });
    return extension;
  }

  private _getWantList(): WantList {
    return {
      blobs: Array.from(this._downloadRequests.values()).map((request) => request.want),
    };
  }

  private _updateExtensionsWantList() {
    for (const extension of this._extensions) {
      extension.updateWantList(this._getWantList());
    }
  }
}
