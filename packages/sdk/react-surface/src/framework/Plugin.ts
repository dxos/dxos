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

export type PluginProvides<TProvides, TContextValue> = TProvides & {
  context?: FC<PropsWithChildren>;
  component?: <P extends PropsWithChildren = PropsWithChildren>(
    datum: any,
    role?: string,
    props?: Partial<P>,
  ) =>
    | FC<
        PropsWithChildren<{
          data: any;
          role?: string;
          actions?: PluginAction[];
          usePluginContext?: () => TContextValue;
        }>
      >
    | undefined
    | null
    | false
    | 0;
  components?: Record<string, FC<any>> & { default?: FC };
  actions?: (datum: any, plugins: Plugin[], role?: string) => PluginAction[];
  useContext?: () => TContextValue;
};

export type Plugin<TProvides = {}, TContextValue = {}> = {
  meta: {
    id: string;
  };
  provides: PluginProvides<TProvides, TContextValue>;
};

export type PluginDefinition<TProvides = {}, TInitProvides = {}, TContextValue = {}> = Omit<Plugin, 'provides'> & {
  provides?: Plugin<TProvides>['provides'];
  init?: () => Promise<PluginProvides<TInitProvides, TContextValue>>;
  ready?: (plugins: Plugin[]) => Promise<void>;
  unload?: () => Promise<void>;
};

export const definePlugin = <TProvides = {}, TInitProvides = {}, TContextValue = {}>(
  plugin: PluginDefinition<TProvides, TInitProvides, TContextValue>,
) => {
  return plugin;
};

export const findPlugin = <T>(plugins: Plugin[], id: string): Plugin<T> | undefined => {
  return plugins.find((plugin) => plugin.meta.id === id) as Plugin<T>;
};
