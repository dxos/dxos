//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

export interface Plugin<State extends {}> {
  id: string;
  components: Record<string, FC>;
  state: State;
}

export abstract class PluginBase<State extends {} = {}> implements Plugin<State> {
  private _state: State;

  protected constructor(
    public readonly id: string,
    public readonly components: Record<string, FC>,
    initialState: State = {} as State
  ) {
    this._state = initialState;
  }

  get state() {
    return this._state;
  }
}
