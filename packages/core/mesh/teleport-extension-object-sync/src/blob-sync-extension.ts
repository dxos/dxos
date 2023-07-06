//

//
// Copyright 2023 DXOS.org
//

import { DeferredTask, scheduleTask, sleep, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { BlobChunk, BlobSyncService, WantList } from '@dxos/protocols/proto/dxos/mesh/teleport/blobsync';
import { ExtensionContext, RpcExtension } from '@dxos/teleport';

export type BlobSyncExtensionParams = {
  onOpen: () => Promise<void>;
  onClose: () => Promise<void>;
  onPush: (data: BlobChunk) => Promise<void>;
};

const MIN_WANT_LIST_UPDATE_INTERVAL = 1000;

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

  /**
   * Set of id's remote peer wants.
   */
  public remoteWantList: WantList = { blobs: [] };

  constructor(
    private readonly _syncParams: BlobSyncExtensionParams, // to not conflict with the base class
  ) {
    super({
      exposed: {
        BlobSyncService: schema.getService('dxos.mesh.teleport.blobsync.BlobSyncService'),
      },
      requested: {
        BlobSyncService: schema.getService('dxos.mesh.teleport.blobsync.BlobSyncService'),
      },
      encodingOptions: {
        preserveAny: true,
      },
    });
  }

  override async onOpen(context: ExtensionContext): Promise<void> {
    await super.onOpen(context);
    await this._syncParams.onOpen();
  }

  override async onClose(err?: Error | undefined): Promise<void> {
    await this._syncParams.onClose();
    await super.onClose(err);
  }

  protected async getHandlers(): Promise<ServiceBundle> {
    return {
      BlobSyncService: {
        want: async (wantList) => {
          log('remote want', wantList);
          this.remoteWantList = wantList;
          this._syncParams.onWantListUpdated(this.remoteWantList);
        },
        push: async (data) => {
          log('received', { data });
          await this._syncParams.onPush(data);
        },
      },
    };
  }

  @synchronized
  async push(data: BlobChunk) {
    if (this._ctx.disposed) {
      return;
    }
    log('push', { data });
    await this.rpc.BlobSyncService.push(data);
  }

  updateWantList(wantList: WantList) {
    if (this._ctx.disposed) {
      return;
    }
    this._localWantList = wantList;
    this._updateWantList.schedule();
  }

  pushInASeparateTask(data: BlobChunk) {
    scheduleTask(this._ctx, () => this.push(data));
  }
}

type ServiceBundle = {
  BlobSyncService: BlobSyncService;
};
