//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

export interface Plugin<State extends {} = {}> {
  id: string;
  // TODO(burdon): Remove state.
  state: State;
  // TODO(burdon): String keys?
  components: Record<string, FC>;
  getComponent: (context: any) => FC | undefined;
}

export abstract class PluginBase<State extends {} = {}> implements Plugin<State> {
  private readonly _state: State;

  protected constructor(
    public readonly id: string,
    public readonly components: Record<string, FC>,
    initialState: State = {} as State
  ) {
    this._state = { ...initialState };
  }

  // TODO(burdon): Plugin context.
  // TODO(burdon): State is part of AppState (useAppState).
  //  By default indexed by the plugin id, although this should be configured since there may be multiple instances.
  get state() {
    return this._state;
  }

  getComponent(context: any): FC | undefined {
    return undefined;
  }
}
