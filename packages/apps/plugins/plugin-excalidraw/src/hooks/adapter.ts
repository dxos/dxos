//
// Copyright 2024 DXOS.org
//

import { type ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

import { AbstractAutomergeStoreAdapter, type Batch } from '@braneframe/plugin-sketch';
import { log } from '@dxos/log';
import { nonNullable } from '@dxos/util';

export type ExcalidrawStoreAdapterProps = {
  onUpdate?: (update: { elements: ExcalidrawElement[] }) => void;
};

/**
 * Excalidraw model.
 *
 * Schema:
 * https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/codebase/json-schema.mdx
 */
// TODO(burdon): Factor out commonality with TLDraw store adapter.
export class ExcalidrawStoreAdapter extends AbstractAutomergeStoreAdapter<ExcalidrawElement> {
  // NOTE: Elements are mutable by the component so need to track the last version.
  private readonly _elements = new Map<string, ExcalidrawElement>();
  private readonly _versions = new Map<string, number>();
  private readonly _modified = new Set<string>();
  private readonly _deleted = new Set<string>();

  constructor(private readonly _props: ExcalidrawStoreAdapterProps = {}) {
    super();
  }

  override getElements() {
    return Array.from(this._elements.values());
  }

  protected override updateModel(batch: Batch<ExcalidrawElement>) {
    batch.updated?.forEach((element) => {
      this._elements.set(element.id, element);
      this._versions.set(element.id, element.version);
    });
    batch.deleted?.forEach((id) => {
      this._elements.delete(id);
      this._versions.delete(id);
    });

    // Update component.
    this._props.onUpdate?.({
      elements: this.getElements(),
    });
  }

  save() {
    if (!this.isOpen) {
      return;
    }

    const updated = Array.from(this._modified)
      .map((id) => this._elements.get(id))
      .filter(Boolean) as ExcalidrawElement[];
    const deleted = Array.from(this._deleted);
    log('save', { updated: updated.length, deleted: deleted.length });
    if (updated.length || deleted.length) {
      super.updateDatabase({ updated, deleted });
    }

    this._modified.clear();
    this._deleted.clear();
  }

  /**
   * Handle update fom component.
   * @return List of modified element IDs.
   */
  update(elements: readonly ExcalidrawElement[]): string[] {
    return elements
      .map((element) => {
        if (element.isDeleted) {
          this._elements.delete(element.id);
          this._modified.add(element.id);
          this._deleted.add(element.id);
          return element.id;
        } else if (element.version !== this._versions.get(element.id)) {
          this._elements.set(element.id, element);
          this._versions.set(element.id, element.version);
          this._modified.add(element.id);
          return element.id;
        }

        return undefined;
      })
      .filter(nonNullable);
  }
}
