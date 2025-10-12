//
// Copyright 2024 DXOS.org
//

import { type ExcalidrawElement } from '@excalidraw/excalidraw/element/types';

import { log } from '@dxos/log';
import { AbstractAutomergeStoreAdapter, type Batch } from '@dxos/plugin-sketch/sdk';
import { isNonNullable } from '@dxos/util';

export type ExcalidrawStoreAdapterProps = {
  onUpdate?: (update: { elements: ExcalidrawElement[] }) => void;
};

/**
 * Excalidraw store adapter.
 *
 * Ref:
 * - https://github.com/loro-dev/loro-excalidraw/blob/main/src/App.tsx
 * - https://github.com/excalidraw/excalidraw/blob/master/dev-docs/docs/codebase/json-schema.mdx
 */
export class ExcalidrawStoreAdapter extends AbstractAutomergeStoreAdapter<ExcalidrawElement> {
  // NOTE: Elements are mutable by the component so need to track the last version.
  private readonly _versions = new Map<string, number>();
  private readonly _elements = new Map<string, ExcalidrawElement>();
  private readonly _modified = new Set<string>();
  private readonly _deleted = new Set<string>();

  constructor(private readonly _props: ExcalidrawStoreAdapterProps = {}) {
    super();
  }

  override getElements(): ExcalidrawElement[] {
    return Array.from(this._elements.values());
  }

  protected override onUpdate({ updated, deleted }: Batch<ExcalidrawElement>): void {
    updated?.forEach((element) => {
      this._elements.set(element.id, element);
      this._versions.set(element.id, element.version);
    });
    deleted?.forEach((id) => {
      this._elements.delete(id);
      this._versions.delete(id);
    });

    // Update component.
    this._props.onUpdate?.({
      elements: this.getElements(),
    });
  }

  save(): void {
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
      .filter(isNonNullable);
  }
}
