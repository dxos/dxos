//

//
// Copyright 2023 DXOS.org
//

import { DeferredTask, sleep, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { RpcClosedError } from '@dxos/protocols';
import { schema } from '@dxos/protocols/proto';
import { type BlobChunk, type BlobSyncService, type WantList } from '@dxos/protocols/proto/dxos/mesh/teleport/blobsync';
import { type ExtensionContext, RpcExtension } from '@dxos/teleport';
import { BitField } from '@dxos/util';

import { type BlobStore } from './blob-store';

export type BlobSyncExtensionProps = {
  blobStore: BlobStore;
  onOpen: () => Promise<void>;
  onClose: () => Promise<void>;
  onAbort: () => Promise<void>;
  onPush: (data: BlobChunk) => Promise<void>;
};

const MIN_WANT_LIST_UPDATE_INTERVAL = process.env.NODE_ENV === 'test' ? 5 : 500;

const MAX_CONCURRENT_UPLOADS = 20;

/**
 * Manages replication between a set of feeds for a single teleport session.
 */
export class BlobSyncExtension extends RpcExtension<ServiceBundle, ServiceBundle> {
  private readonly _ctx = new Context({ onError: (err) => log.catch(err) });

  private _lastWantListUpdate = 0;
  private _localWantList: WantList = { blobs: [] };

  private readonly _updateWantList = new DeferredTask(this._ctx, async () => {
    // Throttle want list updates.
    if (this._lastWantListUpdate + MIN_WANT_LIST_UPDATE_INTERVAL > Date.now()) {
      await sleep(this._lastWantListUpdate + MIN_WANT_LIST_UPDATE_INTERVAL - Date.now());
      if (this._ctx.disposed) {
        return;
      }
    }

    log('want', { list: this._localWantList });
    await this.rpc.BlobSyncService.want(this._localWantList);
    this._lastWantListUpdate = Date.now();
  });

  private _currentUploads = 0;

  private readonly _upload = new DeferredTask(this._ctx, async () => {
    if (this._currentUploads >= MAX_CONCURRENT_UPLOADS) {
      return;
    }
    const blobChunks = await this._pickBlobChunks(MAX_CONCURRENT_UPLOADS - this._currentUploads);
    if (!blobChunks) {
      return;
    }
    for (const blobChunk of blobChunks) {
      if (this._ctx.disposed) {
        break;
      }

      this._currentUploads++;

      this.push(blobChunk)
        .catch((err) => {
          if (err instanceof RpcClosedError) {
            return;
          }
          log.warn('push failed', { err });
        })
        .finally(() => {
          this._currentUploads--;
          this.reconcileUploads();
        });
    }
  });

  /**
   * Set of id's remote peer wants.
   */
  public remoteWantList: WantList = { blobs: [] };

  constructor(
    private readonly _params: BlobSyncExtensionProps, // to not conflict with the base class
  ) {
    super({
      exposed: {
        BlobSyncService: schema.getService('dxos.mesh.teleport.blobsync.BlobSyncService'),
      },
      requested: {
        BlobSyncService: schema.getService('dxos.mesh.teleport.blobsync.BlobSyncService'),
      },
      timeout: 20_000,
      encodingOptions: {
        preserveAny: true,
      },
    });
  }

  override async onOpen(context: ExtensionContext): Promise<void> {
    log('open');
    await super.onOpen(context);
    await this._params.onOpen();
  }

  override async onClose(err?: Error | undefined): Promise<void> {
    log('close');
    await this._ctx.dispose();
    await this._params.onClose();
    await super.onClose(err);
  }

  override async onAbort(err?: Error | undefined): Promise<void> {
    log('abort');
    await this._ctx.dispose();
    await this._params.onAbort();
    await super.onAbort(err);
  }

  protected async getHandlers(): Promise<ServiceBundle> {
    return {
      BlobSyncService: {
        want: async (wantList) => {
          log('remote want', { remoteWantList: wantList });
          this.remoteWantList = wantList;
          this.reconcileUploads();
        },
        push: async (data) => {
          log('received', { data });
          await this._params.onPush(data);
        },
      },
    };
  }

  @synchronized
  async push(data: BlobChunk): Promise<void> {
    if (this._ctx.disposed) {
      return;
    }
    log('push', { data });
    await this.rpc.BlobSyncService.push(data);
  }

  updateWantList(wantList: WantList): void {
    if (this._ctx.disposed) {
      return;
    }
    this._localWantList = wantList;
    this._updateWantList.schedule();
  }

  reconcileUploads(): void {
    if (this._ctx.disposed) {
      return;
    }
    this._upload.schedule();
  }

  private async _pickBlobChunks(amount = 1): Promise<BlobChunk[] | void> {
    if (this._ctx.disposed) {
      return;
    }

    if (!this.remoteWantList.blobs || this.remoteWantList.blobs?.length === 0) {
      return;
    }

    const shuffled = [...this.remoteWantList.blobs].sort(() => Math.random() - 0.5);

    const chunks: BlobChunk[] = [];

    for (const header of shuffled) {
      const meta = await this._params.blobStore.getMeta(header.id);

      if (!meta) {
        // Skip this header
        continue;
      }
      invariant(meta.bitfield);
      invariant(meta.chunkSize);
      invariant(meta.length);

      if (header.chunkSize && header.chunkSize !== meta.chunkSize) {
        log.warn('Invalid chunk size', { header, meta });
        continue;
      }

      const requestBitfield = header.bitfield ?? BitField.ones(meta.length / meta.chunkSize);

      const presentData = BitField.and(requestBitfield, meta.bitfield);
      const chunkIndices = BitField.findIndexes(presentData).sort(() => Math.random() - 0.5);

      for (const idx of chunkIndices) {
        const chunkData = await this._params.blobStore.get(header.id, {
          offset: idx * meta.chunkSize,
          length: Math.min(meta.chunkSize, meta.length - idx * meta.chunkSize),
        });
        chunks.push({
          id: header.id,
          totalLength: meta.length,
          chunkSize: meta.chunkSize,
          chunkOffset: idx * meta.chunkSize,
          payload: chunkData,
        });

        if (chunks.length >= amount) {
          return chunks;
        }
      }
    }

    return chunks;
  }
}

type ServiceBundle = {
  BlobSyncService: BlobSyncService;
};
