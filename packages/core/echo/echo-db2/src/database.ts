import { Database, Item } from "@dxos/echo-db";
import { ObjectModel } from "@dxos/object-model";
import assert from "node:assert";
import { unproxy } from "./common";
import { EchoObject } from "./object";
import { traverse } from "./traverse";

export class EchoDatabase {
  private readonly _objects = new Map<string, EchoObject>();

  constructor(private readonly _echo: Database) {
    this._echo.update.on(() => {
      for(const item of this._echo.select({}).exec().entities) {
        if(!this._objects.has(item.id)) {
          const obj = new EchoObject();
          this._objects.set(item.id, obj);
          obj[unproxy]._bind(item, this);
        }
      }
    })
  }

  async save(obj: EchoObject) {
    if(obj[unproxy]._isBound) {
      return;
    }
    obj[unproxy]._isBound = true;
    this._objects.set(obj[unproxy]._id, obj);

    const item = await this._echo.createItem({
      id: obj[unproxy]._id,
      type: 'warp:dynamic',
    }) as Item<ObjectModel>;
    assert(item.id === obj[unproxy]._id);
    if(!obj[unproxy]._isBound) {
      obj[unproxy]._bind(item, this);
    }
  }

  getById(id: string) {
    return this._objects.get(id);
  }

  subscribe(traverseCb: (touch: (obj: EchoObject) => any) => void, callback: () => void): () => void {
    const touched = new Set<string>();
    const retouch = () => {
      touched.clear();
      console.log('retouch');
      traverse(traverseCb, (obj) => {
        console.log('touched', obj[unproxy]._id);
        touched.add(obj[unproxy]._id);
      });
    }
    retouch();
    return this._echo.update.on((changedEntities) => {
      if(changedEntities.some((entity) => touched.has(entity.id))) {
        retouch();
        callback();
      }
    })
  }
}