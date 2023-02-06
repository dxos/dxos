//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';

import { GraphData } from './types';

/**
 * Graph accessor.
 */
export abstract class GraphModel<N> {
  readonly updated = new Event<GraphData<N>>();

  // TODO(burdon): ID adapter.
  protected constructor(private _selected?: string) {}

  abstract get graph(): GraphData<N>;

  get selected(): string | undefined {
    return this._selected;
  }

  setSelected(id: string | undefined) {
    this._selected = id;
    this.triggerUpdate();
  }

  subscribe(callback: (graph: GraphData<N>) => void) {
    return this.updated.on(callback);
  }

  triggerUpdate() {
    this.updated.emit(this.graph);
  }
}
