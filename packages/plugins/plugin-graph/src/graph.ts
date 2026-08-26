//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Record from 'effect/Record';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as UrlPath from '@dxos/app-toolkit/UrlPath';
import * as GraphNode from '@dxos/graph/GraphNode';

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
    // produces their nodes (see `AppGraphBuilder.UrlGrammar`).
    const builder = AppGraphBuilder.from(/* localStorage.getItem(KEY) ?? */ undefined, registry, {
      anchorKey: UrlPath.WORKSPACE_KEY,
      linkedKey: UrlPath.COMPANION_KEY,
    });
    // const interval = setInterval(() => {
    //   localStorage.setItem(KEY, builder.graph.pickle());
    // }, 5_000);

    const unsubscribe = registry.subscribe(
      extensionsByModuleAtom,
      (extensionsByModule) => {
        const next: AppGraphBuilder.BuilderExtension[] = [];
        for (const [moduleId, extensions] of Object.entries(extensionsByModule)) {
          for (const ext of AppGraphBuilder.flattenExtensions(extensions)) {
            next.push({
              ...ext,
              id: `${moduleId}.${ext.id}`,
            });
          }
        }
        const current = Record.values(registry.get(builder.extensions));
        const removed = current.filter(({ id }) => !next.some(({ id: nextId }) => nextId === id));
        removed.forEach((extension) => AppGraphBuilder.removeExtension(builder, extension.id));
        next.forEach((extension) => AppGraphBuilder.addExtension(builder, extension));
      },
      { immediate: true },
    );

    // await builder.initialize();
    void AppGraph.expandSync(builder.graph, GraphNode.RootId, 'child');

    setupDevtools(builder.graph);

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        // clearInterval(interval);
        unsubscribe();
      }),
    );
    return Capability.contribute(AppCapabilities.AppGraph, builder);
  }),
);

// Expose the graph to the window for debugging.
const setupDevtools = (graph: AppGraph.ExpandableGraph) => {
  (globalThis as any).composer ??= {};
  (globalThis as any).composer.graph = graph;
};
