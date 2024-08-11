//
// Copyright 2024 DXOS.org
//

import { type ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

import { AbstractAutomergeStoreAdapter, type Batch } from '@braneframe/plugin-sketch';
import { invariant } from '@dxos/invariant';

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

  override getElements() {
    return Array.from(this._elements.values());
  }

  // TODO(burdon): Trigger update on component.
  protected override updateModel(batch: Batch<ExcalidrawElement>) {
    batch.updated?.forEach((element) => {
      this._elements.set(element.id, element);
      this._versions.set(element.id, element.version);
    });
    batch.removed?.forEach((id) => {
      this._elements.delete(id);
      this._versions.delete(id);
    });
  }

  protected override onOpen() {}
  protected override onClose() {}

  save() {
    invariant(this.isOpen);
    const updated = Array.from(this._modified)
      .map((id) => this._elements.get(id))
      .filter(Boolean) as ExcalidrawElement[];
    if (updated.length) {
      super.updateDatabase({ updated });
    }
    this._modified.clear();
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
}
