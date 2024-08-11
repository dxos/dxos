//
// Copyright 2023 DXOS.org
//

import { type UnsubscribeCallback } from '@dxos/async';
import { next as A } from '@dxos/automerge/automerge';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type DocAccessor } from '@dxos/react-client/echo';

import { decode, encode, getDeep, rebasePath } from './util';

type BaseElement = { id: string };

export type Batch<Element extends BaseElement> = {
  added?: Element[];
  updated?: Element[];
  deleted?: Element['id'][];
};

/**
 * Generic adapter maps component elements onto Automerge records.
 */
export abstract class AbstractAutomergeStoreAdapter<Element extends BaseElement> {
  private readonly _subscriptions: UnsubscribeCallback[] = [];

  private _accessor?: DocAccessor<any>;
  private _lastHeads?: A.Heads;

  constructor(private readonly _readonly = false) {}

  get isOpen() {
    return !!this._accessor;
  }

  get readonly() {
    return this._readonly;
  }

  open(accessor: DocAccessor<any>) {
    invariant(accessor.path.length);
    if (this.isOpen) {
      this.close();
    }

    log('opening...', { path: accessor.path });

    //
    // Initialize the store with the automerge doc records.
    //
    {
      const map: Record<string, Element> = getDeep(accessor.handle.docSync(), accessor.path) ?? {};
      const records = Object.values(map);
      if (records.length === 0) {
        // If the automerge doc is empty, initialize the automerge doc with the default store records.
        accessor.handle.change((doc) => {
          const map: Record<string, Element> = getDeep(doc, accessor.path, true);
          for (const record of this.getElements()) {
            map[record.id] = encode(record);
          }
        });
      } else {
        // Replace the store records with the automerge doc records.
        this.updateModel({ updated: records.map((record) => decode(record)) });
      }
    }

    //
    // Subscribe to ECHO automerge mutations (events) to update the component store (model).
    //
    {
      const updateModel = () => {
        const doc = accessor.handle.docSync()!;
        const map: Record<string, Element> = getDeep(doc, accessor.path);

        const updated = new Set<Element['id']>();
        const deleted = new Set<Element['id']>();

        const currentHeads = A.getHeads(doc);
        const diff = A.equals(this._lastHeads, currentHeads) ? [] : A.diff(doc, this._lastHeads ?? [], currentHeads);
        diff.forEach((patch) => {
          // TODO(dmaretskyi): Filter out local updates?
          const relativePath = rebasePath(patch.path, accessor.path);
          if (!relativePath) {
            return;
          }

          // TODO(burdon): Comment.
          if (relativePath.length === 0) {
            for (const id of Object.keys(map)) {
              updated.add(id as Element['id']);
            }
            return;
          }

          switch (patch.action) {
            case 'del': {
              if (relativePath.length === 1) {
                deleted.add(relativePath[0] as Element['id']);
                break;
              }
            }
            // eslint-disable-next-line no-fallthrough
            case 'put':
            case 'insert':
            case 'inc':
            case 'splice': {
              updated.add(relativePath[0] as Element['id']);
              break;
            }
            default:
              log.warn('did not process patch', { patch, path: accessor.path });
          }
        });

        log('update', {
          currentHeads,
          lastHeads: this._lastHeads,
          diff: diff.filter((patch) => !!rebasePath(patch.path, accessor.path)),
          updated,
          removed: deleted,
        });

        if (updated.size || deleted.size) {
          this.updateModel({
            updated: Array.from(updated).map((id) => decode(map[id])),
            deleted: Array.from(deleted),
          });
        }

        this._lastHeads = currentHeads;
      };

      accessor.handle.addListener('change', updateModel);
      this._subscriptions.push(() => accessor.handle.removeListener('change', updateModel));
    }

    this._accessor = accessor;
    this.onOpen();
    log('open');
  }

  close() {
    log('closing...');
    this.onClose();
    // TODO(burdon): Replace with context.
    this._subscriptions.forEach((unsubscribe) => unsubscribe());
    this._subscriptions.length = 0;
    this._accessor = undefined;
    log('closed');
  }

  /**
   * Update the database.
   */
  protected updateDatabase(batch: Batch<Element>) {
    invariant(this.isOpen);
    if (this.readonly) {
      log.warn('Attempting to update read-only store.');
      return;
    }

    const accessor = this._accessor!;
    accessor!.handle.change((doc) => {
      log('updated', {
        added: batch.added?.length ?? 0,
        updated: batch.updated?.length ?? 0,
        removed: batch.deleted?.length ?? 0,
      });

      invariant(this._accessor);
      const map: Record<string, Element> = getDeep(doc, accessor.path, true);
      batch.added?.forEach((element) => {
        map[element.id] = encode(element);
      });
      batch.updated?.forEach((element) => {
        map[element.id] = encode(element);
      });
      batch.deleted?.forEach((id) => {
        delete map[id];
      });
    });
  }

  // TODO(burdon): Pluggable encoding/decoding.

  /**
   * Get all elements from model.
   */
  abstract getElements(): readonly Element[];

  protected abstract onOpen(): void;
  protected abstract onClose(): void;

  /**
   * Update local model.
   */
  protected abstract updateModel(batch: Batch<Element>): void;
}
