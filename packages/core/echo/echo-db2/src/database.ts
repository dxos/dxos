//
// Copyright 2022 DXOS.org
//

import assert from 'node:assert';

import { Database, Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';

import { unproxy } from './common';
import { EchoObject } from './object';
import { traverse } from './traverse';

export type SelectionFn = never; // TODO(dmaretskyi): ?
export type Selection = EchoObject | SelectionFn | Selection[];
export type Predicate = { [key: string]: any };
export type Anchor = EchoDatabase | EchoObject | EchoObject[] | undefined;
export type Selector = Predicate;

/**
 *
 */
interface SelectionHandle {
  update: (selection: Selection) => void;
  subscribed: boolean;
  unsubscribe: () => void;
}

/**
 *
 */
export class EchoDatabase {
  private readonly _objects = new Map<string, EchoObject>();

  constructor(private readonly _echo: Database) {
    this._echo.update.on(() => {
      for (const object of this._echo.select({}).exec().entities) {
        if (!this._objects.has(object.id)) {
          const obj = new EchoObject();
          this._objects.set(object.id, obj);
          obj[unproxy]._bind(object, this);
        }
      }
    });
  }

  get objects() {
    return Array.from(this._objects.values());
  }

  getObjectById(id: string) {
    // TODO(burdon): Type?
    return this._objects.get(id);
  }

  /**
   * Flush mutations.
   */
  // TODO(burdon): Batches?
  async save(obj: EchoObject): Promise<EchoObject> {
    if (obj[unproxy]._isBound) {
      return obj;
    }

    obj[unproxy]._isBound = true;
    this._objects.set(obj[unproxy]._id, obj);

    const item = (await this._echo.createItem({ id: obj[unproxy]._id })) as Item<ObjectModel>;
    assert(item.id === obj[unproxy]._id);
    obj[unproxy]._bind(item, this);

    return obj;
  }

  /**
   * @deprecated
   */
  subscribe(traverseCb: (touch: (obj: EchoObject) => any) => void, callback: () => void): () => void {
    const touched = new Set<string>();
    const retouch = () => {
      touched.clear();
      console.log('retouch');
      traverse(traverseCb, (obj) => {
        console.log('touched', obj[unproxy]._id);
        touched.add(obj[unproxy]._id);
      });
    };

    retouch();
    return this._echo.update.on((changedEntities) => {
      if (changedEntities.some((entity) => touched.has(entity.id))) {
        retouch();
        callback();
      }
    });
  }

  /**
   *
   */
  query(selection: Selector): Selector {
    return {};
  }

  /**
   *
   */
  createSubscription(onUpdate: () => void): SelectionHandle {
    let selectedIds = new Set<string>();
    let subscribed = true;
    const unsubscribe = this._echo.update.on((changedEntities) => {
      subscribed = false;
      if (changedEntities.some((entity) => selectedIds.has(entity.id))) {
        onUpdate();
      }
    });

    const handle = {
      update: (selection: Selection) => {
        selectedIds = new Set(getIdsFromSelection(selection));
        return handle;
      },
      subscribed,
      unsubscribe
    };

    return handle;
  }
}

const getIdsFromSelection = (selection: Selection): string[] => {
  if (selection instanceof EchoObject) {
    return [selection[unproxy]._id];
  } else if (typeof selection === 'function') {
    return []; // TODO(burdon): Traverse function?
  } else {
    return selection.flatMap(getIdsFromSelection);
  }
};
