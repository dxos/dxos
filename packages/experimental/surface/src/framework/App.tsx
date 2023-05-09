//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, createContext, useContext } from 'react';

import { raise } from '@dxos/debug';

import { Action } from './Action';
import { Plugin } from './Plugin';
import { useSurface } from './Surface';

/**
 * @deprecated
 */
export type RouteAdapter<T> = {
  paramsToState: (params: any) => T;
  stateToPath: (state?: T) => string;
};

type AppContextType = {
  plugins: Plugin<any, any>[];
  state: Record<string, any>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

type AppContextProviderProps = {
  plugins?: Plugin<any, any>[];
};

// TODO(burdon): Set-up plugin contexts.
export const AppContextProvider = ({ children, plugins = [] }: PropsWithChildren<AppContextProviderProps>) => {
  const state = plugins.reduce<Record<string, any>>((state, plugin) => {
    return { ...state, [plugin.config.id]: plugin.config.initialState };
  }, {});

  return <AppContext.Provider value={{ plugins, state }}>{children}</AppContext.Provider>;
};

export const usePlugins = (): Plugin<any, any>[] => {
  const { plugins } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  return plugins;
};

export const usePluginState = <TState extends {}>(type: typeof Plugin<TState, any>): TState => {
  const { state } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  const { plugin } = useSurface();
  // TODO(burdon): Type check.
  return state[plugin.config.id];
};

// TODO(burdon): Dispatch to all or bubble?
export const useActionDispatch = () => {
  const { plugins, state } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  return <TAction extends Action>(action: TAction) => {
    plugins.forEach((plugin) => {
      const reducer = plugin.config.reducer;
      if (reducer) {
        // TODO(burdon): Use ctx util.
        setTimeout(() => {
          const pluginState = state[plugin.config.id];
          state[plugin.config.id] = reducer(pluginState, action);
        });
      }
    });
  };
};
