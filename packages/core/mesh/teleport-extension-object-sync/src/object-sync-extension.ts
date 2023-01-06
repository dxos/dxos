//

import { scheduleTask, synchronized } from '@dxos/async';
import { Context } from '@dxos/context';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { DataObject, ObjectSyncService } from '@dxos/protocols/proto/dxos/mesh/teleport/objectsync';
import { ExtensionContext, RpcExtension } from '@dxos/teleport';

export type ObjectSyncExtensionParams = {
  onOpen: () => Promise<void>;
  onClose: () => Promise<void>;
  onWantListUpdated: (wantList: Set<string>) => void;
  onPush: (data: DataObject) => Promise<void>;
}

/**
 * Manages replication between a set of feeds for a single teleport session.
 */
export class ObjectSyncExtension extends RpcExtension<ServiceBundle, ServiceBundle> {
  private readonly _ctx = new Context();

  /**
   * Set of id's remote peer wants.
   */
  public remoteWantList = new Set<string>();

  constructor(
    private readonly _syncParams: ObjectSyncExtensionParams // to not conflict with the base class
  ) {
    super({
      exposed: {
        ObjectSyncService: schema.getService('dxos.mesh.teleport.objectsync.ObjectSyncService'),
      },
      requested: {
        ObjectSyncService: schema.getService('dxos.mesh.teleport.objectsync.ObjectSyncService'),
      },
      encodingOptions: {
        preserveAny: true
      }
    })
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
      ObjectSyncService: {
        want: async (headers) => {
          log('remote want', { ids: headers.ids })
          this.remoteWantList = new Set(headers.ids ?? []);
          this._syncParams.onWantListUpdated(this.remoteWantList);
        },
        push: async (data) => {
          log('received', { data })
          await this._syncParams.onPush(data);
        }
      }
    }
  }

  @synchronized
  async push(data: DataObject) {
    if (this._ctx.disposed) {
      return;
    }
    log('push', { data })
    await this.rpc.ObjectSyncService.push(data);
  }

  @synchronized
  async updateWantList(wantList: Set<string>) {
    if (this._ctx.disposed) {
      return;
    }

    log('want', { wantList })
    await this.rpc.ObjectSyncService.want({ ids: [...wantList] });
  }

  pushInASeparateTask(data: DataObject) {
    scheduleTask(this._ctx, () => this.push(data));
  }

  updateWantListInASeparateTask(wantList: Set<string>) {
    scheduleTask(this._ctx, async () => this.updateWantList(wantList))
  }
}

type ServiceBundle = {
  ObjectSyncService: ObjectSyncService;
};
