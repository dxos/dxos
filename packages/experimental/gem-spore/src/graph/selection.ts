//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';

/**
 * Graph model with subscriptions.
 */
export class SelectionModel {
  // TODO(burdon): Surface EventTrigger (cannot update).
  readonly updated = new Event<SelectionModel>();

  // TODO(burdon): Create separate model (e.g., multi-select).
  private _selected?: string;

  get selected(): string | undefined {
    return this._selected;
  }

  setSelected(id: string | undefined): this {
    this._selected = id;
    this.updated.emit(this);
    return this;
  }
}
