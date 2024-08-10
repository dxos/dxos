//
// Copyright 2024 DXOS.org
//

import { type ExcalidrawElement } from '@excalidraw/excalidraw/types';

/**
 * Excalidraw model.
 */
export class ExcalidrawModel {
  // NOTE: Elements are mutable by the component so need to track the last version.
  private readonly _elements = new Map<string, ExcalidrawElement>();
  private readonly _versions = new Map<string, number>();
  private readonly _modified = new Set<string>();

  get elements(): readonly ExcalidrawElement[] {
    return Object.values(this._elements);
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
