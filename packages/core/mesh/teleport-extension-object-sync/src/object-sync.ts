import { DataObject } from "@dxos/protocols/proto/dxos/mesh/teleport/objectsync";
import { ObjectSyncExtension } from "./object-sync-extension";

export type ObjectSyncParams = {
  onRequest: (id: string) => Promise<DataObject>;
  
};

export class ObjectSync {
  createExtension() {
    return new ObjectSyncExtension({
      onWantListUpdated: () => {

      },
      onPush: () => Promise.resolve()
    });
  }
}