//
// Copyright 2023 DXOS.org
//

import { FC, Context } from 'react';

import { Action, ActionHandlers } from './Action';

export type Store<T = any, A = any> = {
  value: T;
  dispatch(state: T, ...actions: A[]): T;
  // subscribe(listener: (value: T) => any): { stop: Function };
};

export interface Plugin<TState = any, TAction extends Action = Action> {
  meta: {
    id: string;
  };
  provides: {
    stores?: Record<string, Store>;
    context?: FC | Context<any>;
    components?: Record<string, FC>;
    getComponent?: (datum: any) => FC;
    // graph?: {
    //   nodes?(parent?: GraphNode)
    // };
  };
}

export const definePlugin = <TState, TAction extends Action>(plugin: Plugin<TState, TAction>) => {
  return plugin;
};
