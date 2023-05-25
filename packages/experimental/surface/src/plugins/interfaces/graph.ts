//
// Copyright 2023 DXOS.org
//

import { FC } from 'react';
import { Plugin } from '../../framework';

type ObservableObject<T> = T & {};

type MaybePromise<T> = T | Promise<T>;

type GraphNode<TDatum = any> = ObservableObject<{
  id: string;
  label: string;
  description?: string;
  icon?: FC;
  data?: TDatum;
  actions?: GraphNodeAction[];
  children?: GraphNode[];
  parent?: GraphNode;
}>;

type GraphNodeAction = {
  id: string;
  label: string;
  icon?: FC;
  invoke: (event: UIEvent) => MaybePromise<void>;
};

export type GraphInterface = {
  graph: {
    nodes?: (plugins: Plugin[], parent?: GraphNode) => GraphNode[];
    actions?: (plugins: Plugin[], parent?: GraphNode) => GraphNodeAction[];
  };
};

export type PluginWithGraphInterface = Plugin<GraphInterface>;

export const hasGraphInterface = (p: Plugin): p is PluginWithGraphInterface => p?.provides?.graph;

type Plugin1 = {
  provides: {
    graph: {
      nodes: () => {}
    };
  };
};

type Plugin2 = {
  provides: [
    {
      key: 'graph.dxos.org';
      value: {
        nodes: () => {};
      };
    }
  ];
};

type Interface<T> = {
  key: string;
  interface: T;
};

type GraphInterface = {
  key: 'graph.dxos.org',
  value: {
    nodes(): any;
  }
}

const getInterface = <T>(plugins: Plugin[], interface: Interface<T>): T => {
  return null;
};

const defineInterface = () => {
  return {
    query() {},
    provide() {}
  };
};
