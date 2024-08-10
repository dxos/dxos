//
// Copyright 2024 DXOS.org
//

import { type ExcalidrawElement } from '@excalidraw/excalidraw/types';

import type { DocAccessor } from '@dxos/echo-db';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

import { decode, encode, getDeepAndInit } from './util';

// TODO(burdon): Move to SketchType?
export type ExcalidrawStoreData = {
  schema?: string; // Undefined means version 1.
  content: Record<string, any>;
};

/**
 * Excalidraw model.
 */
// TODO(burdon): Factor out commonality with TLDraw store adapter.
export class ExcalidrawModel {
  // NOTE: Elements are mutable by the component so need to track the last version.
  private readonly _elements = new Map<string, ExcalidrawElement>();
  private readonly _versions = new Map<string, number>();
  private readonly _modified = new Set<string>();

  private _accessor?: DocAccessor<ExcalidrawStoreData>;

  get elements(): readonly ExcalidrawElement[] {
    return Array.from(this._elements.values());
  }

  get isOpen(): boolean {
    return !!this._accessor;
  }

  open(accessor: DocAccessor<ExcalidrawStoreData>) {
    if (this.isOpen) {
      this.close();
    }

    invariant(accessor.path.length);
    this._accessor = accessor;
    log.info('open');

    const doc = accessor.handle.docSync();
    const elementMap: Record<string, ExcalidrawElement> = getDeepAndInit(doc, this._accessor.path);
    const records = Object.values(elementMap);
    if (records.length === 0) {
      accessor.handle.change((doc) => {
        getDeepAndInit(doc, accessor.path);
      });
    } else {
      for (const record of records) {
        const element = decode(record);
        log.info('load', { id: element.id, version: element.version, element });
        this._elements.set(element.id, element);
        this._versions.set(element.id, element.version);
      }
    }
  }

  close() {
    log.info('close');
    this._accessor = undefined;
  }

  // TODO(burdon): Check able to merge.
  // TODO(burdon): Generalize encoded item map from TLDraw. Need unit tests.
  save() {
    invariant(this.isOpen);
    invariant(this._accessor && this._accessor.path);
    const accessor = this._accessor;
    const modified = this.getModified(true);
    if (modified.length) {
      accessor.handle.change((doc) => {
        const elementMap: Record<string, ExcalidrawElement> = getDeepAndInit(doc, accessor.path);
        for (const element of modified) {
          log.info('save', { id: element.id, version: element.version, element });
          elementMap[element.id] = encode(element);
        }
      });
    }
  }

  update(elements: readonly ExcalidrawElement[]): string[] {
    return elements
      .map((element) => {
        if (element.version !== this._versions.get(element.id)) {
          this._elements.set(element.id, element);
          this._versions.set(element.id, element.version);
          this._modified.add(element.id);
          return element.id;
        }

        return undefined;
      })
      .filter(Boolean) as string[];
  }

  getModified(clear = false): ExcalidrawElement[] {
    const elements = Array.from(this._modified)
      .map((id) => this._elements.get(id))
      .filter(Boolean) as ExcalidrawElement[];
    if (clear) {
      this._modified.clear();
    }
    return elements;
  }
}
