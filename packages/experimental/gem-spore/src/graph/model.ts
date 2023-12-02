//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';

import { defaultIdAccessor, type IdAccessor, type GraphData } from './types';

/**
 * Graph model with subscriptions.
 */
// TODO(burdon): Evolve to use signal.
export abstract class GraphModel<N> {
  readonly updated = new Event<GraphData<N>>();
  private _selected?: string;

  constructor(private readonly _idAccessor: IdAccessor<N> = defaultIdAccessor) {}

  abstract get graph(): GraphData<N>;

  get idAccessor() {
    return this._idAccessor;
  }

  // TODO(burdon): Create separate model (e.g., multi-select).
  get selected(): string | undefined {
    return this._selected;
  }

  setSelected(id: string | undefined) {
    this._selected = id;
    this.triggerUpdate();
  }

  subscribe(callback: (graph: GraphData<N>) => void, fire = false) {
    const handle = this.updated.on(callback);
    if (fire) {
      this.triggerUpdate();
    }

    return handle;
  }

  triggerUpdate() {
    this.updated.emit(this.graph);
  }
}
