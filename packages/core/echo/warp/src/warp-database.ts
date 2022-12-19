import { Database, Item } from "@dxos/echo-db";
import { ObjectModel } from "@dxos/object-model";
import assert from "node:assert";
import { unproxy, WarpObject } from "./warp-object";

export class WarpDatabase {
  private readonly _objects = new Map<string, WarpObject>();

  constructor(private readonly _echo: Database) {}

  save(obj: WarpObject) {
    if(obj[unproxy]._isImported) {
      return;
    }
    obj[unproxy]._isImported = true;
    this._objects.set(obj[unproxy]._id, obj);

    setTimeout(async () => {
      const item = await this._echo.createItem({
        id: obj[unproxy]._id,
        type: 'warp:dynamic',
      }) as Item<ObjectModel>;
      assert(item.id === obj[unproxy]._id);
      obj[unproxy]._import(item, this);
    })  
  }

  getById(id: string) {
    return this._objects.get(id);
  }
}