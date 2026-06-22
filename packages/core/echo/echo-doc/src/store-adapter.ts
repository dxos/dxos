//
// Copyright 2025 DXOS.org
//

import { next as A } from '@automerge/automerge';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { isNonNullable } from '@dxos/util';

import * as Doc from './Doc';
import { decode as defaultDecode, encode as defaultEncode, getDeep, rebasePath } from './record';

export type BaseElement = { id: string };

/**
 * Batch of element changes.
 */
export type Batch<Element extends BaseElement> = {
  added?: Element[];
  updated?: Element[];
  deleted?: Element['id'][];
};

/**
 * Accumulates pending local mutations.
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

export type StoreAdapterOptions = {
  readonly?: boolean;
  /** Encode a model value to an Automerge record (defaults to a structural codec). */
  encode?: (value: any) => any;
  /** Decode an Automerge record to a model value. */
  decode?: (value: any) => any;
};

/**
 * Two-way sync between an external store and an id-keyed `Record<string, Element>` held at an
 * accessor's path within an Automerge document. Subclasses bind a concrete store (e.g. tldraw,
 * excalidraw) by implementing {@link getElements} / {@link onUpdate} and registering store
 * listeners in {@link onOpen}.
 */
// TODO(burdon): Make element id key configurable.
export abstract class AbstractStoreAdapter<Element extends BaseElement> {
  #accessor?: Doc.Accessor<any>;
  #lastHeads?: A.Heads;
  #cleanup?: () => void;
  readonly #readonly: boolean;
  readonly #encode: (value: any) => any;
  readonly #decode: (value: any) => any;

  constructor(options: StoreAdapterOptions = {}) {
    this.#readonly = options.readonly ?? false;
    this.#encode = options.encode ?? defaultEncode;
    this.#decode = options.decode ?? defaultDecode;
  }

  get isOpen(): boolean {
    return !!this.#accessor;
  }

  get readonly(): boolean {
    return this.#readonly;
  }

  /**
   * Binds the adapter to the element map at `accessor.path`. Returns a dispose function; calling it
   * (or {@link close}) tears down the subscription and any listeners registered in {@link onOpen}.
   */
  open(accessor: Doc.Accessor<any>): () => void {
    invariant(accessor.path.length);
    if (this.isOpen) {
      this.close();
    }

    log('opening...', { path: accessor.path });
    this.#accessor = accessor;
    const onOpenCleanup = this.onOpen();

    // Seed the document from the store, or hydrate the store from the document.
    {
      const map: Record<string, Element> = getDeep(accessor.handle.doc(), accessor.path) ?? {};
      const records = Object.values(map);
      if (records.length === 0) {
        accessor.handle.change((doc) => {
          const map: Record<string, Element> = getDeep(doc, accessor.path, true);
          for (const record of this.getElements()) {
            map[record.id] = this.#encode(record);
          }
        });
      } else {
        this.onUpdate({ updated: records.map((record) => this.#decode(record)) });
      }
    }

    // Propagate document mutations (local and remote) into the store.
    const updateModel = () => {
      const doc = accessor.handle.doc()!;
      const map: Record<string, Element> = getDeep(doc, accessor.path);

      const updated = new Set<Element['id']>();
      const deleted = new Set<Element['id']>();

      const currentHeads = A.getHeads(doc);
      const diff = A.equals(this.#lastHeads, currentHeads) ? [] : A.diff(doc, this.#lastHeads ?? [], currentHeads);
      diff.forEach((patch) => {
        const relativePath = rebasePath(patch.path, accessor.path);
        if (!relativePath) {
          return;
        }

        // A patch on the map root (e.g. initial assignment) touches every element.
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

      if (updated.size || deleted.size) {
        this.onUpdate({
          updated: Array.from(updated)
            .map((id) => this.#decode(map[id]))
            .filter(isNonNullable), // Elements modified then eventually removed.
          deleted: Array.from(deleted),
        });
      }

      this.#lastHeads = currentHeads;
    };

    accessor.handle.addListener('change', updateModel);
    this.#cleanup = () => {
      accessor.handle.removeListener('change', updateModel);
      onOpenCleanup?.();
    };

    log('open');
    return () => this.close();
  }

  close(): void {
    if (!this.isOpen) {
      return;
    }

    log('closing...');
    this.onClose();
    this.#cleanup?.();
    this.#cleanup = undefined;
    this.#accessor = undefined;
    this.#lastHeads = undefined;
    log('closed');
  }

  /**
   * Writes a batch of element changes to the document.
   */
  protected updateDatabase(batch: Batch<Element>): void {
    invariant(this.isOpen);
    if (this.#readonly) {
      log.warn('attempting to update read-only store');
      return;
    }

    const accessor = this.#accessor!;
    accessor.handle.change((doc) => {
      const map: Record<string, Element> = getDeep(doc, accessor.path, true);
      this.#removeDeleted(batch, batch.added)?.forEach((element) => (map[element.id] = this.#encode(element)));
      this.#removeDeleted(batch, batch.updated)?.forEach((element) => (map[element.id] = this.#encode(element)));
      batch.deleted?.forEach((id) => delete map[id]);
    });
  }

  #removeDeleted(batch: Batch<Element>, elements?: Element[]): Element[] | undefined {
    return batch.deleted ? elements?.filter((element) => !batch.deleted!.includes(element.id)) : elements;
  }

  /**
   * Returns all elements currently in the store.
   */
  abstract getElements(): readonly Element[];

  /**
   * Applies document changes to the store.
   */
  protected abstract onUpdate(batch: Batch<Element>): void;

  /**
   * Called when the adapter opens; return a cleanup function to run on close (e.g. to remove store listeners).
   */
  protected onOpen(): (() => void) | void {}

  protected onClose(): void {}
}
