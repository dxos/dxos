//
// Copyright 2021 DXOS.org
//

import { Event } from '@dxos/async';

import { defaultIdAccessor, IdAccessor, GraphData } from './types';

/**
 * Graph model with subscriptions.
 */
export abstract class GraphModel<N> {
  readonly updated = new Event<GraphData<N>>();
  private _selected?: string;

  // prettier-ignore
  constructor(
    private readonly _idAccessor: IdAccessor<N> = defaultIdAccessor
  ) {}

  abstract get graph(): GraphData<N>;

  get idAccessor() {
    return this._idAccessor;
  }

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
