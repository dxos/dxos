//
// Copyright 2023 DXOS.org
//

import type { IconProps } from '@phosphor-icons/react';
import type { UIEvent, FC } from 'react';

import type { TFunction } from '@dxos/aurora';
import type { Plugin } from '@dxos/react-surface';

export type MaybePromise<T> = T | Promise<T>;

export type GraphNode<TDatum = any> = {
  id: string;
  label: string | [string, { ns: string; count?: number }];
  description?: string;
  icon?: FC;
  data?: TDatum; // nit about naming this
  parent?: GraphNode;
  children?: GraphNode[];
  actions?: GraphNodeAction[];
  attributes?: { [key: string]: any };
};

export type GraphNodeAction = {
  id: string;
  testId?: string;
  // todo(thure): `Parameters<TFunction>` causes typechecking issues because `TFunction` has so many signatures
  label: string | [string, { ns: string; count?: number }];
  icon?: FC<IconProps>;
  invoke: (t: TFunction, event: UIEvent) => MaybePromise<void>;
};

export type GraphContextValue = {
  roots: { [key: string]: GraphNode[] };
  actions: { [key: string]: GraphNodeAction[] };
};

export type GraphProvides = {
  graph: {
    nodes?: (plugins: Plugin[]) => GraphNode[];
    actions?: (plugins: Plugin[]) => GraphNodeAction[];
  };
};

export type GraphPluginProvides = {
  graph: GraphContextValue;
};
