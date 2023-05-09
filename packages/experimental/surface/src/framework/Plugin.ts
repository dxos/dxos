//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';

import { Action, NullAction } from './Action';

export interface PluginConfig<TState extends {} = {}, TAction extends Action = typeof NullAction> {
  id: string;
  // TODO(burdon): Named components?
  components: Record<string, FC>;
  initialState?: TState;
  reducer?: (state: TState, action: TAction) => TState;
}

export abstract class Plugin<TState extends {} = {}, TAction extends Action = typeof NullAction> {
  protected constructor(public readonly config: PluginConfig<TState, TAction>) {}

  getComponent(context: any): FC | undefined {
    return undefined;
  }
}
