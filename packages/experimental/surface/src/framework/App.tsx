//
// Copyright 2023 DXOS.org
//

import React, { PropsWithChildren, createContext, useContext, useState, SetStateAction, Dispatch } from 'react';

import { raise } from '@dxos/debug';

import { Action } from './Action';
import { Plugin } from './Plugin';
import { useSurface } from './Surface';

type AppContextType = {
  plugins: Plugin<any, any>[];
  pluginsState: Record<string, any>;
  setPluginsState: Dispatch<SetStateAction<Record<string, any>>>;
};

const AppContext = createContext<AppContextType | undefined>(undefined);

type AppContextProviderProps = {
  plugins?: Plugin<any, any>[];
};

export const AppContextProvider = ({ children, plugins = [] }: PropsWithChildren<AppContextProviderProps>) => {
  // TODO(burdon): Hack -- use preact signals or https://signia.tldraw.dev/docs/react-bindings?
  const [pluginsState, setPluginsState] = useState(
    plugins.reduce<Record<string, any>>((state, plugin) => {
      return { ...state, [plugin.config.id]: plugin.config.initialState };
    }, {})
  );

  return <AppContext.Provider value={{ plugins, pluginsState, setPluginsState }}>{children}</AppContext.Provider>;
};

export const usePlugins = (): Plugin<any, any>[] => {
  const { plugins } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  return plugins;
};

export const usePluginState = <TState extends {}>(type: typeof Plugin<TState, any>): TState => {
  const { pluginsState } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  const { plugin } = useSurface();
  // TODO(burdon): Type check.
  return pluginsState[plugin.config.id];
};

export const useActionDispatch = () => {
  const { plugins, pluginsState, setPluginsState } = useContext(AppContext) ?? raise(new Error('Missing AppContext'));
  return <TAction extends Action>(action: TAction) => {
    // TODO(burdon): Dispatch to all or bubble?
    plugins.forEach((plugin) => {
      const reducer = plugin.config.reducer;
      if (reducer) {
        // TODO(burdon): Use ctx util.
        pluginsState[plugin.config.id] = reducer(pluginsState[plugin.config.id], action);
      }

      // TODO(burdon): Hack.
      setPluginsState({ ...pluginsState });
    });
  };
};
