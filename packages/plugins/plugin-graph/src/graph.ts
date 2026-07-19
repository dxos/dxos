//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Graph, GraphBuilder, Node } from '@dxos/app-graph';
import { AppCapabilities } from '@dxos/app-toolkit';

// TODO(wittjosiah): Remove or restore graph caching.
// import { meta } from './meta';

// const KEY = `${meta.id}.app-graph`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capability.get(Capabilities.AtomRegistry);
    const extensionsByModuleAtom = yield* Capability.atomByModule(AppCapabilities.AppGraphBuilder);

    const builder = GraphBuilder.from(/* localStorage.getItem(KEY) ?? */ undefined, registry);
    // const interval = setInterval(() => {
    //   localStorage.setItem(KEY, builder.graph.pickle());
    // }, 5_000);

    const unsubscribe = registry.subscribe(
      extensionsByModuleAtom,
      (extensionsByModule) => {
        const next: GraphBuilder.BuilderExtension[] = [];
        for (const [moduleId, extensions] of Object.entries(extensionsByModule)) {
          for (const ext of GraphBuilder.flattenExtensions(extensions)) {
            // Default the URL prefix key to the plugin id so every node-producing extension is
            // URL-addressable out of the box; keys are global (never namespaced by module), unlike
            // node/extension ids. Action/action-group entries produce no nodes, so they're left
            // unkeyed unless an extension explicitly sets `urlKey` itself.
            next.push({
              ...ext,
              id: `${moduleId}.${ext.id}`,
              urlKey: ext.urlKey ?? (ext.connector ? moduleId : undefined),
            });
          }
        }
        const current = Record.values(registry.get(builder.extensions));
        const removed = current.filter(({ id }) => !next.some(({ id: nextId }) => nextId === id));
        removed.forEach((extension) => GraphBuilder.removeExtension(builder, extension.id));
        next.forEach((extension) => GraphBuilder.addExtension(builder, extension));
      },
      { immediate: true },
    );

    // await builder.initialize();
    void Graph.expand(builder.graph, Node.RootId, 'child');

    setupDevtools(builder.graph);

    return Capability.contributes(
      AppCapabilities.AppGraph,
      { graph: builder.graph, explore: GraphBuilder.explore, builder },
      () =>
        Effect.sync(() => {
          // clearInterval(interval);
          unsubscribe();
        }),
    );
  }),
);

// Expose the graph to the window for debugging.
const setupDevtools = (graph: Graph.ExpandableGraph) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.graph = graph;
};
