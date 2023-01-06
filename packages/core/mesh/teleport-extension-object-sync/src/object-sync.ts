import { scheduleTask, Trigger } from "@dxos/async";
import { Context } from "@dxos/context";
import { log } from "@dxos/log";
import { DataObject } from "@dxos/protocols/proto/dxos/mesh/teleport/objectsync";
import { entry } from "@dxos/util";
import { ObjectSyncExtension } from "./object-sync-extension";

export type ObjectSyncParams = {
  getObject: (id: string) => Promise<DataObject | undefined>;
  setObject: (data: DataObject) => Promise<void>;
};

export class ObjectSync {
  private readonly _ctx = new Context();

  private readonly _downloadRequests = new Map<string, Trigger<DataObject>>();
  private readonly _extensions = new Set<ObjectSyncExtension>();

  constructor(
    private readonly _params: ObjectSyncParams
  ) { }

  async open() {

  }

  async close() {
    await this._ctx.dispose();
  }

  download(id: string): Promise<DataObject> {
    log('download', { id })
    const trigger = entry(this._downloadRequests, id).orInsert(new Trigger<DataObject>()).value

    for (const extension of this._extensions) {
      extension.updateWantListInASeparateTask(new Set(this._downloadRequests.keys()));
    }

    return trigger.wait();
  }

  createExtension() {
    const extension = new ObjectSyncExtension({
      onOpen: async () => {
        log('extension opened')
        this._extensions.add(extension);
        extension.updateWantListInASeparateTask(new Set(this._downloadRequests.keys()));
      },
      onClose: async () => {
        log('extension closed')
        this._extensions.delete(extension);
      },
      onWantListUpdated: () => {
        scheduleTask(this._ctx, async () => {
          const objs = await Promise.all([...extension.remoteWantList].map(async (id) => this._params.getObject(id)));
          log('other peers wants', { want: extension.remoteWantList, have: objs })
          for (const obj of objs) {
            if (obj) {
              extension.pushInASeparateTask(obj);
            }
          }
        })
      },
      onPush: async (obj) => {
        if (!this._downloadRequests.has(obj.id)) {
          return
        }
        log('received', { obj })
        await this._params.setObject(obj);
        this._downloadRequests.get(obj.id)?.wake(obj);
        this._downloadRequests.delete(obj.id);

        for (const extension of this._extensions) {
          if (extension.remoteWantList.has(obj.id)) {
            extension.pushInASeparateTask(obj);
          }
        }
      }
    });
    return extension;
  }
}