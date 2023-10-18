//
// Copyright 2023 DXOS.org
//

import React, { type FC, type PropsWithChildren, createContext, useContext } from 'react';

import { type Plugin } from '@dxos/react-surface';

/**
 * An intent is an abstract description of an operation to be performed.
 * Intents allow actions to be performed across plugins.
 */
export type Intent = {
  /**
   * Plugin ID.
   * If specified, the intent will be sent explicitly to the plugin.
   * Otherwise, the intent will be sent to all plugins, in order and the first to resolve a non-null value will be used.
   */
  plugin?: string;

  /**
   * The action to perform.
   */
  action: string;

  /**
   * Any data needed to perform the desired action.
   */
  data?: any;
};

export type DispatchIntent = (intent: Intent | Intent[]) => Promise<any>;

export type IntentContextType = {
  dispatch: DispatchIntent;
};

const IntentContext = createContext<IntentContextType>({ dispatch: async () => {} });

export const IntentContextProvider: FC<PropsWithChildren<{ dispatch: DispatchIntent }>> = ({ dispatch, children }) => (
  <IntentContext.Provider value={{ dispatch }}>{children}</IntentContext.Provider>
);

export const useIntent = () => useContext(IntentContext);

export type IntentProvides = {
  intent: {
    resolver: (intent: Intent, plugins: Plugin[]) => any;
  };
};

export type IntentPluginProvides = {
  intent: {
    /**
     * Trigger one or more intents to be sent.
     * If multiple intents are specified, the result of each will be merged with the data to the next.
     *
     * @returns The result of the last intent.
     */
    dispatch: DispatchIntent;
  };
};

// TODO(burdon): Make generic? Use findPlugin?
type IntentPlugin = Plugin<IntentProvides>;
export const filterPlugins = (plugins: Plugin[]): IntentPlugin[] =>
  (plugins as IntentPlugin[]).filter((plugin) => typeof plugin.provides.intent?.resolver === 'function');
