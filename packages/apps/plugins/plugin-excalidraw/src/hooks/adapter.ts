//
// Copyright 2024 DXOS.org
//

import { type ExcalidrawElement } from '@excalidraw/excalidraw/types/element/types';

import { AbstractAutomergeStoreAdapter, type Batch } from '@braneframe/plugin-sketch';
import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';

export type ExcalidrawStoreAdapterProps = {
  onUpdate?: (batch: Batch<ExcalidrawElement>) => void;
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
    log.info('updateModel', { batch });
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
      added: this.getElements(),
    });
  }

  protected override onOpen() {
    this.updateModel?.({
      added: this.getElements(),
    });
  }

  protected override onClose() {}

  save() {
    invariant(this.isOpen);
    // TODO(burdon): Track deleted.
    const updated = Array.from(this._modified)
      .map((id) => this._elements.get(id))
      .filter(Boolean) as ExcalidrawElement[];
    const deleted = Array.from(this._deleted);
    log.info('save', { updated: updated.length, deleted: deleted.length });
    if (updated.length || deleted.length) {
      super.updateDatabase({ updated, deleted });
    }
    this._modified.clear();
    this._deleted.clear();
  }

  update(elements: readonly ExcalidrawElement[]): string[] {
    return elements
      .map((element) => {
        if (element.isDeleted) {
          this._deleted.add(element.id);
        } else if (element.version !== this._versions.get(element.id)) {
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
