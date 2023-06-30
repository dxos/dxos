//
// Copyright 2023 DXOS.org
//

import { trackLeaks } from '@dxos/async';
import { Any } from '@dxos/codec-protobuf';
import { Context, cancelWithContext } from '@dxos/context';
import { timed } from '@dxos/debug';
import { log } from '@dxos/log';
import { schema } from '@dxos/protocols';
import { SpaceSnapshot } from '@dxos/protocols/proto/dxos/echo/snapshot';
import { DataObject } from '@dxos/protocols/proto/dxos/mesh/teleport/objectsync';
import { ObjectSync } from '@dxos/teleport-extension-object-sync';

import { SnapshotStore } from './snapshot-store';

/**
 * Snapshot manager for a specific space.
 */
@trackLeaks('open', 'close')
export class SnapshotManager {
  private readonly _objectSync: ObjectSync;

  // prettier-ignore
  constructor(
    private readonly _snapshotStore: SnapshotStore
  ) {
    this._objectSync = new ObjectSync({
      getObject: async (id: string) => {
        const snapshot = await this._snapshotStore.loadSnapshot(id);
        log('getObject', { id, snapshot });
        if (!snapshot) {
          return undefined;
        }
        return {
          id,
          payload: schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot').encodeAsAny(snapshot)
        };
      },
      setObject: async (data: DataObject) => {
        log('setObject', { data });
        const snapshot = schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot').decode((data.payload as Any).value);
        await this._snapshotStore.saveSnapshot(snapshot);
      }
    });
  }

  get objectSync() {
    return this._objectSync;
  }

  async open() {
    await this._objectSync.open();
  }

  async close() {
    await this._objectSync.close();
  }

  @timed(10_000)
  async load(ctx: Context, id: string): Promise<SpaceSnapshot> {
    const local = await cancelWithContext(ctx, this._snapshotStore.loadSnapshot(id));
    if (local) {
      return local;
    }

    const remote = await cancelWithContext(ctx, this._objectSync.download(ctx, id));
    return schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot').decode((remote.payload as Any).value);
  }

  async store(snapshot: SpaceSnapshot): Promise<string> {
    const id = await this._snapshotStore.saveSnapshot(snapshot);
    return id;
  }
}
