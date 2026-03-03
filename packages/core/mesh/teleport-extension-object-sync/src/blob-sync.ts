//
// Copyright 2023 DXOS.org
//

import { Mutex, Trigger, trackLeaks } from '@dxos/async';
import { Context, cancelWithContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { PublicKey } from '@dxos/keys';
import { log } from '@dxos/log';
import { BlobMeta } from '@dxos/protocols/proto/dxos/echo/blob';
import { type WantList } from '@dxos/protocols/proto/dxos/mesh/teleport/blobsync';
import { BitField, ComplexMap } from '@dxos/util';

import { type BlobStore } from './blob-store';
import { BlobSyncExtension } from './blob-sync-extension';

export type BlobSyncProps = {
  blobStore: BlobStore;
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
  private readonly _mutex = new Mutex();

  private readonly _downloadRequests = new ComplexMap<Uint8Array, DownloadRequest>((key) =>
    PublicKey.from(key).toHex(),
  );

  private readonly _extensions = new Set<BlobSyncExtension>();

  constructor(private readonly _params: BlobSyncProps) {}

  async open(): Promise<void> {}

  async close(): Promise<void> {
    await this._ctx.dispose();
  }

  /**
   * Resolves when the object with the given id is fully downloaded in the blob store.
   *
   * @param id hex-encoded id of the object to download.
   */
  async download(ctx: Context, id: Uint8Array): Promise<void> {
    log('download', { id });
    const request = await this._mutex.executeSynchronized(async () => {
      const existingRequest = this._downloadRequests.get(id);

      if (existingRequest) {
        existingRequest.counter++;
        return existingRequest;
      }

      const meta = await this._params.blobStore.getMeta(id);
      const request: DownloadRequest = {
        trigger: new Trigger(),
        counter: 1,
        want: {
          id,
          chunkSize: meta?.chunkSize,
          bitfield: meta?.bitfield && Uint8Array.from(BitField.invert(meta.bitfield)),
        },
      };

      // Check if the object is already fully downloaded.
      if (meta?.state === BlobMeta.State.FULLY_PRESENT) {
        request.trigger.wake();
      } else {
        this._downloadRequests.set(id, request);
        this._updateExtensionsWantList();
      }

      return request;
    });

    ctx?.onDispose(() =>
      this._mutex.executeSynchronized(async () => {
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

  createExtension(): BlobSyncExtension {
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
      onAbort: async () => {
        log('extension aborted');
        this._extensions.delete(extension);
      },
      onPush: async (blobChunk) => {
        if (!this._downloadRequests.has(blobChunk.id)) {
          return;
        }
        log('received', { blobChunk });
        const meta = await this._params.blobStore.setChunk(blobChunk);
        if (meta.state === BlobMeta.State.FULLY_PRESENT) {
          this._downloadRequests.get(blobChunk.id)?.trigger.wake();
          this._downloadRequests.delete(blobChunk.id);
        } else {
          invariant(meta.bitfield);
          this._downloadRequests.get(blobChunk.id)!.want.bitfield = BitField.invert(meta.bitfield);
        }

        this._updateExtensionsWantList();
        this._reconcileUploads();
      },
    });
    return extension;
  }

  /**
   * Notify extensions that a blob with the given id was added to the blob store.
   */
  async notifyBlobAdded(_id: Uint8Array): Promise<void> {
    this._reconcileUploads();
  }

  private _getWantList(): WantList {
    return {
      blobs: Array.from(this._downloadRequests.values()).map((request) => request.want),
    };
  }

  private _reconcileUploads(): void {
    for (const extension of this._extensions) {
      extension.reconcileUploads();
    }
  }

  private _updateExtensionsWantList(): void {
    for (const extension of this._extensions) {
      extension.updateWantList(this._getWantList());
    }
  }
}
