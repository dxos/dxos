import { Database, Item } from "@dxos/echo-db";
import { ObjectModel } from "@dxos/object-model";
import { unproxy, WarpObject } from "./warp-object";

export class WarpDatabase {
  constructor(private readonly _echo: Database) {}

  save(obj: WarpObject) {
    setTimeout(async () => {
      const item = await this._echo.createItem({
        type: 'warp:dynamic',
      }) as Item<ObjectModel>;
      obj[unproxy]._import(item);
    })  
  }
}