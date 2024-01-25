//
// Copyright 2023 DXOS.org
//

import { type Space, type Query } from '@dxos/client/echo';
import { type Filter, type Subscription, type TypedObject } from '@dxos/echo-schema';

export type ObjectIndexer<T extends TypedObject> = (object: T) => string | undefined;

/**
 * Merge.
 */
export class ObjectSyncer<T extends TypedObject> {
  private readonly _mapById = new Map<string, { indexedValue: string; object: T }>();
  private readonly _mapByIndex = new Map<string, T>();

  private _subscription?: Subscription;

  constructor(private readonly _filter: Filter<T>, private readonly _indexer: ObjectIndexer<T>) {}

  async open(space: Space) {
    await this.close();
    this._subscription = space.db.query(this._filter).subscribe((query: Query<T>) => {
      for (const object of query.objects) {
        const value = this._indexer(object);
        if (value !== undefined) {
          this._mapById.set(object.id, { indexedValue: value, object });
          this._mapByIndex.set(value, object);
        } else {
          const { indexedValue } = this._mapById.get(object.id) ?? {};
          if (indexedValue !== undefined) {
            this._mapByIndex.delete(indexedValue);
          }
        }
      }
    }, true);
  }

  async close() {
    if (this._subscription) {
      this._subscription = undefined;
    }
  }

  getObject(value: string): T | undefined {
    return this._mapByIndex.get(value);
  }
}
