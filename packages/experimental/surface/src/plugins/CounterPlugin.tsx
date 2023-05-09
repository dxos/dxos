//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Action, createActionReducer, Plugin, usePluginState } from '../framework';

export type CounterAction = Action & {
  type: 'inc';
};

export type CounterState = {
  count?: number;
};

const CounterPanel = () => {
  const { count } = usePluginState(CounterPlugin);
  return <div>Count: {count}</div>;
};

export class CounterPlugin extends Plugin<CounterState, CounterAction> {
  constructor() {
    super({
      id: 'org.dxos.counter',
      components: {
        main: CounterPanel
      },
      initialState: { count: 0 },
      reducer: createActionReducer<CounterState, CounterAction>({
        inc: (state, action) => ({ ...state, count: (state.count ?? 0) + 1 })
      })
    });
  }
}
