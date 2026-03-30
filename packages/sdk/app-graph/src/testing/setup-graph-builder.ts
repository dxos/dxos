//
// Copyright 2026 DXOS.org
//

import { Registry } from '@effect-atom/atom-react';
import * as Option from 'effect/Option';

import * as Graph from '../graph';
import * as GraphBuilder from '../graph-builder';
import * as Node from '../node';

export type SetupGraphBuilderOptions = {
  registry?: Registry.Registry;
  extensions?: GraphBuilder.BuilderExtensions;
};

export const setupGraphBuilder = ({ registry = Registry.make(), extensions }: SetupGraphBuilderOptions = {}) => {
  const builder = GraphBuilder.make({ registry });
  const graph = builder.graph;

  if (extensions) {
    GraphBuilder.addExtension(builder, extensions);
  }

  return {
    registry,
    builder,
    graph,
    addExtensions: (nextExtensions: GraphBuilder.BuilderExtensions) => {
      GraphBuilder.addExtension(builder, nextExtensions);
    },
    expand: async (id: string, relation: Node.RelationInput = 'child') => {
      Graph.expand(graph, id, relation);
      await GraphBuilder.flush(builder);
    },
    flush: () => GraphBuilder.flush(builder),
    getConnections: (id: string, relation: Node.RelationInput = 'child') => registry.get(graph.connections(id, relation)),
    getNode: (id: string) => Graph.getNode(graph, id).pipe(Option.getOrNull),
  };
};
