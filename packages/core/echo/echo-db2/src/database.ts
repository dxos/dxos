//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Database, Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { unproxy } from './common';
import { EchoObject } from './object';

type Selector = {};

interface SelectionHandle {
  unsubscribe(): void;
}

/**
 *
 */
export class EchoDatabase {
  private readonly _objects = new Map<string, EchoObject>();

  constructor(private readonly _echo: Database) {}

  get objects() {
    return Array.from(this._objects.values());
  }

  getObjectById(id: string) {
    // TODO(burdon): Type?
    return this._objects.get(id);
  }

  /**
   *
   */
  select(selector: Selector): SelectionHandle {
    return {
      unsubscribe() {}
    };
  }

  async save(obj: EchoObject) {
    if (obj[unproxy]._isImported) {
      return;
    }

    obj[unproxy]._isImported = true;
    this._objects.set(obj[unproxy]._id, obj);

    const item = (await this._echo.createItem({
      id: obj[unproxy]._id,
      type: 'warp:dynamic' // TODO(burdon): ?
    })) as Item<ObjectModel>;

    assert(item.id === obj[unproxy]._id);
    obj[unproxy]._bind(item, this);
  }
}
