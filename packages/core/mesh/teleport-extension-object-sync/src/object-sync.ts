//
// Copyright 2023 DXOS.org
//

import { scheduleTask, trackLeaks, Trigger } from '@dxos/async';
import { cancelWithContext, Context } from '@dxos/context';
import { log } from '@dxos/log';
import { DataObject } from '@dxos/protocols/proto/dxos/mesh/teleport/objectsync';
import { entry } from '@dxos/util';

import { ObjectSyncExtension } from './object-sync-extension';

export type ObjectSyncParams = {
  getObject: (id: string) => Promise<DataObject | undefined>;
  setObject: (data: DataObject) => Promise<void>;
};

@trackLeaks('open', 'close')
export class ObjectSync {
  private readonly _ctx = new Context();

  private readonly _downloadRequests = new Map<string, { trigger: Trigger<DataObject>; counter: number }>();
  private readonly _extensions = new Set<ObjectSyncExtension>();

  constructor(private readonly _params: ObjectSyncParams) {}

  async open() {}

  async close() {
    await this._ctx.dispose();
  }

  download(ctx: Context, id: string): Promise<DataObject> {
    log('download', { id });

    const existingRequest = this._downloadRequests.get(id);
    if (existingRequest) {
      existingRequest.counter++;
      return existingRequest.trigger.wait();
    }

    const value = entry(this._downloadRequests, id).orInsert({
      trigger: new Trigger<DataObject>(),
      counter: 1,
    }).value;

    for (const extension of this._extensions) {
      extension.updateWantListInASeparateTask(new Set(this._downloadRequests.keys()));
    }

    ctx?.onDispose(() => {
      // Remove request if context is disposed and nobody else requests it.
      const request = entry(this._downloadRequests, id).value;
      if (!request) {
        return;
      }
      if (--request.counter === 0) {
        this._downloadRequests.delete(id);
      }
      for (const extension of this._extensions) {
        extension.updateWantListInASeparateTask(new Set(this._downloadRequests.keys()));
      }
    });

    return ctx ? cancelWithContext(ctx, value.trigger.wait()) : value.trigger.wait();
  }

  createExtension() {
    const extension = new ObjectSyncExtension({
      onOpen: async () => {
        log('extension opened');
        this._extensions.add(extension);
        extension.updateWantListInASeparateTask(new Set(this._downloadRequests.keys()));
      },
      onClose: async () => {
        log('extension closed');
        this._extensions.delete(extension);
      },
      onWantListUpdated: () => {
        scheduleTask(this._ctx, async () => {
          const objs = await Promise.all([...extension.remoteWantList].map(async (id) => this._params.getObject(id)));
          log('other peers wants', { want: extension.remoteWantList, have: objs });
          for (const obj of objs) {
            if (obj) {
              extension.pushInASeparateTask(obj);
            }
          }
        });
      },
      onPush: async (obj) => {
        if (!this._downloadRequests.has(obj.id)) {
          return;
        }
        log('received', { obj });
        await this._params.setObject(obj);
        this._downloadRequests.get(obj.id)?.trigger.wake(obj);
        this._downloadRequests.delete(obj.id);

        for (const extension of this._extensions) {
          if (extension.remoteWantList.has(obj.id)) {
            extension.pushInASeparateTask(obj);
          }
        }
      },
    });
    return extension;
  }
}
