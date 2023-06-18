//
// Copyright 2023 DXOS.org
//

import { IconProps } from '@phosphor-icons/react';
import { FC, PropsWithChildren, UIEvent } from 'react';

import { TFunction } from '@dxos/aurora';

import { MaybePromise } from '../plugins';

export type PluginAction = {
  id: string;
  testId?: string;
  // todo(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures
  label: [string, { ns: string; count?: number }];
  icon?: FC<IconProps>;
  invoke: (t: TFunction, event: UIEvent) => MaybePromise<void>;
};

export type PluginProvides<TProvides> = TProvides & {
  context?: FC<PropsWithChildren>;
  component?: <P extends PropsWithChildren = PropsWithChildren>(
    datum: any,
    role?: string,
    props?: Partial<P>,
  ) => FC<PropsWithChildren<{ data: any; role?: string; actions?: PluginAction[] }>> | undefined | null | false | 0;
  components?: Record<string, FC<any>> & { default?: FC };
  actions?: (datum: any, role?: string) => PluginAction[];
};

export type Plugin<TProvides = {}> = {
  meta: {
    id: string;
  };
  provides: PluginProvides<TProvides>;
};

export type PluginDefinition<TProvides = {}, TInitProvides = {}> = Omit<Plugin, 'provides'> & {
  provides?: Plugin<TProvides>['provides'];
  init?: () => Promise<PluginProvides<TInitProvides>>;
  ready?: (plugins: Plugin[]) => Promise<void>;
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
