//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/react-surface';

import type { Graph, GraphImpl } from './graph';

export type GraphContextValue = {
  graph: GraphImpl;
};

export type WithPlugins = (plugin: Plugin[]) => Graph.NodeBuilder;

export type GraphProvides = {
  graph: {
    nodes?: Graph.NodeBuilder;
    withPlugins?: WithPlugins;
  };
};

export type GraphPluginProvides = {
  graph: GraphImpl;
};
