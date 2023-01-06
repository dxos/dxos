//

import { DataObject, ObjectSyncService } from '@dxos/protocols/proto/dxos/mesh/teleport/objectsync';
import { RpcExtension } from '@dxos/teleport';
import { ObjectSync } from './object-sync';

export type ObjectSyncExtensionParams = {
  onWantListUpdated: (wantList: Set<string>) => void;
  onPush: (data: DataObject) => Promise<void>;
}

/**
 * Manages replication between a set of feeds for a single teleport session.
 */
export class ObjectSyncExtension extends RpcExtension<ServiceBundle, ServiceBundle> {
  /**
   * Set of id's remote peer wants.
   */
  public remoteWantList = new Set<string>();

  constructor(
    private readonly _syncParams: ObjectSyncExtensionParams // to not conflict with the base class
  ) {
    super({
      encodingOptions: {
        preserveAny: true
      }
    })
  }

  protected async getHandlers(): Promise<ServiceBundle> {
    return {
      ObjectSyncService: {
        want: async (headers) => {
          for (const id of headers.ids ?? []) {
            this.remoteWantList.add(id);
          }
          this._syncParams.onWantListUpdated(this.remoteWantList);
        },
        unwant: async (headers) => {
          for (const id of headers.ids ?? []) {
            this.remoteWantList.delete(id);
          }
          this._syncParams.onWantListUpdated(this.remoteWantList);
        },
        push: async (data) => {
          await this._syncParams.onPush(data);
        }
      }
    }
  }
}

type ServiceBundle = {
  ObjectSyncService: ObjectSyncService;
};
