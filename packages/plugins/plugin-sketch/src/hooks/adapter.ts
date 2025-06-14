//
// Copyright 2023 DXOS.org
//

import { transact } from '@tldraw/state';
import { createTLStore, defaultShapeUtils, type TLRecord } from '@tldraw/tldraw';
import { type TLStore } from '@tldraw/tlschema';

import { type Context } from '@dxos/context';
import { invariant } from '@dxos/invariant';

import { AbstractAutomergeStoreAdapter, type Batch, Modified } from '../util';

/**
 * Ref:
 * - https://tldraw.dev/docs/persistence#Listening-for-changes
 * - https://github.com/tldraw/tldraw-yjs-example/blob/main/src/useYjsStore.ts
 * - https://github.com/LiangrunDa/tldraw-with-automerge/blob/main/src/App.tsx
 */
export class TLDrawStoreAdapter extends AbstractAutomergeStoreAdapter<TLRecord> {
  private readonly _modified = new Modified<TLRecord>();
  private _store?: TLStore;

  get store() {
    return this._store;
  }

  override getElements(): TLRecord[] {
    invariant(this._store);
    return this._store.allRecords();
  }

  protected override onUpdate({ added = [], updated = [], deleted = [] }: Batch<TLRecord>): void {
    // Replace the store records with the automerge doc records.
    transact(() => {
      invariant(this._store);
      const elements = [...added, ...updated];
      this._store.remove(deleted);
      this._store.put(elements);
    });
  }

  protected override onOpen(ctx: Context): void {
    this._store = createTLStore({ shapeUtils: defaultShapeUtils });

    // List for changes to the store.
    // TODO(burdon): Upload images to WNFS.
    const subscription = this._store.listen(
      ({ changes: { added, updated, removed } }) => {
        Object.values(added).forEach((record) => this._modified.added.set(record.id, record));
        Object.values(updated).forEach(([_, record]) => this._modified.updated.set(record.id, record));
        Object.values(removed).forEach((record) => this._modified.deleted.add(record.id));
      },
      // Only listen to local document changes.
      {
        scope: 'document',
        source: 'user',
      },
    );

    ctx.onDispose(() => subscription());
  }

  protected override onClose(): void {
    this._store = undefined;
  }

  save(): void {
    this.updateDatabase(this._modified.batch());
    this._modified.clear();
  }
}
