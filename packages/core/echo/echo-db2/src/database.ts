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

interface SelectionHandle {
  updateSelection: (selection: Selection) => void;
  unsubscribe: () => void;
}

/**
 *
 */
export class EchoDatabase {
  private readonly _objects = new Map<string, EchoObject>();

  constructor(private readonly _echo: Database) {
    this._echo.update.on(() => {
      for (const item of this._echo.select({}).exec().entities) {
        if (!this._objects.has(item.id)) {
          const obj = new EchoObject();
          this._objects.set(item.id, obj);
          obj[unproxy]._bind(item, this);
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

  getById(id: string) {
    return this._objects.get(id);
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

  selection(onUpdate: () => void): SelectionHandle {
    let selectedIds = new Set<string>();

    const unsub = this._echo.update.on((changedEntities) => {
      if (changedEntities.some((entity) => selectedIds.has(entity.id))) {
        onUpdate();
      }
    });

    return {
      updateSelection: (selection: Selection) => {
        selectedIds = new Set(getIdsFromSelection(selection));
      },
      unsubscribe: () => {
        unsub();
      }
    };
  }
}

const getIdsFromSelection = (selection: Selection): string[] => {
  if (selection instanceof EchoObject) {
    return [selection[unproxy]._id];
  } else if (typeof selection === 'function') {
    return [];
  } else {
    return selection.flatMap(getIdsFromSelection);
  }
};
