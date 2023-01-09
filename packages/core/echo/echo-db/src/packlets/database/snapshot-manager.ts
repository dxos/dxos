import { SnapshotStore } from "./snapshot-store";
import { ObjectSync } from '@dxos/teleport-extension-object-sync'
import { SpaceSnapshot } from "@dxos/protocols/proto/dxos/echo/snapshot";
import { schema } from "@dxos/protocols";
import { DataObject } from "@dxos/protocols/proto/dxos/mesh/teleport/objectsync";

/**
 * Snapshot manager for a specific space.
 */
export class SnapshotManager {
  private readonly _objectSync: ObjectSync;

  // prettier-ignore
  constructor(
    private readonly _snapshotStore: SnapshotStore,
  ) {
    this._objectSync = new ObjectSync({
      getObject: async (id: string) => {
        const snapshot = await this._snapshotStore.loadSnapshot(id);
        if(!snapshot) {
          return undefined;
        }
        return {
          id,
          payload: schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot').encodeAsAny(snapshot)
        }
      },
      setObject: async (data: DataObject) => {
        const snapshot = schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot').decode(data.payload);
        await this._snapshotStore.saveSnapshot(snapshot);
      }
    });
  }

  async open() {
    await this._objectSync.open();
  }

  async close() {
    await this._objectSync.close();
  }

  async load(id: string): Promise<SpaceSnapshot> {
    const local = await this._snapshotStore.loadSnapshot(id);
    if(local) {
      return local;
    }

    const remote = await this._objectSync.download(id);
    return schema.getCodecForType('dxos.echo.snapshot.SpaceSnapshot').decode(remote.payload);
  }

  async store(snapshot: SpaceSnapshot): Promise<string> {
    const id = await this._snapshotStore.saveSnapshot(snapshot);
    return id;
  }
}