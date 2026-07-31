//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';

import { Capabilities, Capability } from '@dxos/app-framework';
import { Graph, GraphBuilder, Node } from '@dxos/app-graph';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';

// TODO(wittjosiah): Remove or restore graph caching.
// import { meta } from './meta';

// const KEY = `${meta.id}.app-graph`;

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const registry = yield* Capabilities.AtomRegistry;

    // Live view: extensions contributed by dependency-mode modules (including those enabled
    // later in the session) reach this subscription reactively.
    const extensionsByModuleAtom = yield* Capability.atomByModule(AppCapabilities.AppGraphBuilder);

    // The grammar's fixed tiers, configured here rather than declared by an extension: no connector
    // produces their nodes (see `GraphBuilder.UrlGrammar`).
    const builder = GraphBuilder.from(/* localStorage.getItem(KEY) ?? */ undefined, registry, {
      anchorKey: UrlPath.WORKSPACE_KEY,
      linkedKey: UrlPath.COMPANION_KEY,
    });
    // const interval = setInterval(() => {
    //   localStorage.setItem(KEY, builder.graph.pickle());
    // }, 5_000);

    const unsubscribe = registry.subscribe(
      extensionsByModuleAtom,
      (extensionsByModule) => {
        const next: GraphBuilder.BuilderExtension[] = [];
        for (const [moduleId, extensions] of Object.entries(extensionsByModule)) {
          for (const ext of GraphBuilder.flattenExtensions(extensions)) {
            next.push({
              ...ext,
              id: `${moduleId}.${ext.id}`,
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

    return Capability.contribute(AppCapabilities.AppGraph, builder, () =>
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
