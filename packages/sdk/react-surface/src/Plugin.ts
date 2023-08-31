//
// Copyright 2023 DXOS.org
//

import { FC, PropsWithChildren } from 'react';

export type ComponentProps = PropsWithChildren<{
  data: any;
  role?: string;
}>;

export type PluginProvides<TProvides> = TProvides & {
  context?: FC<PropsWithChildren>;
  component?: <P extends PropsWithChildren = PropsWithChildren>(
    data: unknown,
    role?: string,
    props?: Partial<P>,
  ) => FC<ComponentProps> | undefined | null | false | 0;
  components?: Record<string, FC<ComponentProps>> & { default?: FC };
};

export type Plugin<TProvides = {}> = {
  meta: {
    id: string;
    // TODO(wittjosiah): How should these be managed?
    shortId?: string;
  };
  provides: PluginProvides<TProvides>;
};

export type PluginDefinition<TProvides = {}, TInitializeProvides = {}> = Omit<Plugin, 'provides'> & {
  provides?: Plugin<TProvides>['provides'];
  initialize?: () => Promise<PluginProvides<TInitializeProvides>>;
  ready?: (plugins: Plugin[]) => Promise<void>;
  unload?: () => Promise<void>;
};

export const findPlugin = <T>(plugins: Plugin[], id: string): Plugin<T> | undefined => {
  return plugins.find(
    (plugin) => plugin.meta.id === id || (typeof plugin.meta.shortId === 'string' && plugin.meta.shortId === id),
  ) as Plugin<T>;
};
