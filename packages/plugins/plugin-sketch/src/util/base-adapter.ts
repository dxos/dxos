//
// Copyright 2023 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { Context } from '@dxos/context';
import { type DocAccessor } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

import { decode, encode, getDeep, rebasePath } from './util';

// TODO(burdon): Factor out to echo/automerge util.

export type BaseElement = { id: string };

/**
 * Batch of changes to be processed.
 */
export type Batch<Element extends BaseElement> = {
  added?: Element[];
  updated?: Element[];
  deleted?: Element['id'][];
};

/**
 * Current mutation state.
 */
export class Modified<Element extends BaseElement> {
  readonly added = new Map<Element['id'], Element>();
  readonly updated = new Map<Element['id'], Element>();
  readonly deleted = new Set<Element['id']>();

  batch(): Batch<Element> {
    return {
      added: Array.from(this.added.values()),
      updated: Array.from(this.updated.values()),
      deleted: Array.from(this.deleted.values()),
    };
  }

  clear(): void {
    this.added.clear();
    this.updated.clear();
    this.deleted.clear();
  }
}

/**
 * Generic adapter maps generic elements onto a map of Automerge records within an object.
 */
// TODO(burdon): Make encoding/decoding configurable.
export abstract class AbstractAutomergeStoreAdapter<Element extends BaseElement> {
  private _ctx?: Context;
  private _accessor?: DocAccessor<any>;
  private _lastHeads?: A.Heads;

  constructor(private readonly _readonly = false) {}

  get isOpen() {
    return !!this._accessor;
  }

  get readonly() {
    return this._readonly;
  }

  /**
   * @param accessor Accessor for element map.
   */
  async open(accessor: DocAccessor<any>): Promise<void> {
    invariant(accessor.path.length);
    if (this.isOpen) {
      await this.close();
    }

    log('opening...', { path: accessor.path });

    // Call onOpen before initialization.
    this._ctx = new Context();
    this._accessor = accessor;
    this.onOpen(this._ctx);

    //
    // Initialize the component store with the automerge doc records.
    //
    {
      const map: Record<string, Element> = getDeep(accessor.handle.doc(), accessor.path) ?? {};
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
        this.onUpdate({
          updated: records.map((record) => decode(record)),
        });
      }
    }

    //
    // Subscribe to ECHO automerge mutations (events) to update the component store (model).
    //
    {
      const updateModel = () => {
        const doc = accessor.handle.doc()!;
        const map: Record<string, Element> = getDeep(doc, accessor.path);

        const updated = new Set<Element['id']>();
        const deleted = new Set<Element['id']>();

        const currentHeads = A.getHeads(doc);
        const diff = A.equals(this._lastHeads, currentHeads) ? [] : A.diff(doc, this._lastHeads ?? [], currentHeads);
        diff.forEach((patch) => {
          // Filter mutations based on accessor path.
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
          deleted,
        });

        if (updated.size || deleted.size) {
          this.onUpdate({
            updated: Array.from(updated)
              .map((id) => decode(map[id]))
              .filter(isNonNullable), // Modified elements that were eventually removed
            deleted: Array.from(deleted),
          });
        }

        this._lastHeads = currentHeads;
      };

      accessor.handle.addListener('change', updateModel);
      this._ctx.onDispose(() => accessor.handle.removeListener('change', updateModel));
    }

    log('open');
  }

  async close(): Promise<void> {
    if (!this.isOpen) {
      return;
    }

    log('closing...');
    this.onClose();
    await this._ctx!.dispose();
    this._ctx = undefined;
    this._accessor = undefined;
    log('closed');
  }

  /**
   * Update the database.
   */
  protected updateDatabase(batch: Batch<Element>): void {
    invariant(this.isOpen);
    if (this.readonly) {
      log.warn('Attempting to update read-only store.');
      return;
    }

    const accessor = this._accessor!;
    accessor.handle.change((doc) => {
      log('updateDatabase', {
        added: batch.added?.length ?? 0,
        updated: batch.updated?.length ?? 0,
        deleted: batch.deleted?.length ?? 0,
      });

      const map: Record<string, Element> = getDeep(doc, accessor.path, true);
      this._removeDeleted(batch, batch.added)?.forEach((element) => (map[element.id] = encode(element)));
      this._removeDeleted(batch, batch.updated)?.forEach((element) => (map[element.id] = encode(element)));
      batch.deleted?.forEach((id) => delete map[id]);
    });
  }

  private _removeDeleted(batch: Batch<Element>, elements?: Element[]): Element[] | undefined {
    return batch.deleted ? elements?.filter((element) => !batch.deleted!.includes(element.id)) : elements;
  }

  /**
   * Get all elements from model.
   */
  abstract getElements(): readonly Element[];

  /**
   * Update local model.
   */
  protected abstract onUpdate(batch: Batch<Element>): void;

  protected onOpen(ctx: Context): void {}
  protected onClose(): void {}
}
