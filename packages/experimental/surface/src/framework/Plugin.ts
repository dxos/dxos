//
// Copyright 2023 DXOS.org
//

import { FC, PropsWithChildren } from 'react';

export type PluginProvides<TProvides> = TProvides & {
  context?: FC<PropsWithChildren>;
  component?: <P extends PropsWithChildren = PropsWithChildren>(
    datum: any,
    props?: Partial<P>,
  ) => FC<PropsWithChildren<{ data: any }>> | undefined | null;
  components?: Record<string, FC> & { default?: FC };
};

export type Plugin<TProvides = {}> = {
  meta: {
    id: string;
  };
  provides: PluginProvides<TProvides>;
};

export type PluginDefinition<TProvides = {}, TInitProvides = {}> = Omit<Plugin, 'provides'> & {
  provides?: Plugin<TProvides>['provides'];
  init?: (plugins: Plugin[]) => Promise<PluginProvides<TInitProvides>>;
  unload?: () => Promise<void>;
};

export const definePlugin = <TProvides = {}, TInitProvides = {}>(
  plugin: PluginDefinition<TProvides, TInitProvides>,
) => {
  return plugin;
};

export const findPlugin = <T>(plugins: Plugin[], id: string): Plugin<T> | undefined => {
  return plugins.find((plugin) => plugin.meta.id === id) as Plugin<T>;
};
