//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterAll, bench, describe } from 'vitest';

import * as GraphNode from '@dxos/graph/GraphNode';

import * as Graph from './AppGraph.ts';
import * as GraphBuilder from './AppGraphBuilder.ts';
import * as Node from './AppGraphNode.ts';

//
// A builder re-running over output that did not change: an object's actions are rebuilt whenever
// anything the builder reads changes, with a new closure and a new label tuple per action, as the
// Composer space plugin builds them. Each re-run should cost the diff and emit no node changes.
//
//   DX_RUN_MANUAL_TESTS=1 pnpm exec vitest bench --run --project node src/AppGraph.bench.ts
//

const ROOT = GraphNode.RootId;
const OBJECTS = 8;
const ACTIONS = 40;
const BENCH_OPTIONS = { time: 500 };

const setup = () => {
  const registry = Registry.make();
  const revision = Atom.make(0).pipe(Atom.keepAlive);
  const builder = GraphBuilder.make({ registry });
  GraphBuilder.addExtension(
    builder,
    GraphBuilder.createExtensionRaw({
      id: 'objects',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: () => [],
            onSome: (source) =>
              source.id === ROOT
                ? Array.from({ length: OBJECTS }, (unusedValue, index) => ({
                    id: `o${index}`,
                    type: 'org.dxos.type.example',
                    data: index,
                    properties: { label: ['object.label', { ns: 'org.dxos.type.example' }] },
                  }))
                : [],
          }),
        ),
      actions: (node) =>
        Atom.make((get) => {
          get(revision);
          return Option.match(get(node), {
            onNone: () => [],
            onSome: (source) =>
              source.id === ROOT
                ? []
                : Array.from({ length: ACTIONS }, (unusedValue, index) => ({
                    id: `a${index}`,
                    data: () => Effect.void,
                    properties: {
                      label: [`action-${index}.label`, { ns: 'org.dxos.type.example', defaultValue: 'Action' }],
                      icon: 'ph--pencil-simple-line--regular',
                      disposition: 'list-item',
                    },
                  })),
          });
        }),
    }),
  );
  return { registry, revision, builder, graph: builder.graph };
};

const { registry, revision, builder, graph } = setup();
Graph.expandSync(graph, ROOT, 'child');
await GraphBuilder.flush(builder);
for (let index = 0; index < OBJECTS; index++) {
  Graph.expandSync(graph, `${ROOT}/o${index}`, Node.action);
}
await GraphBuilder.flush(builder);

let changes = 0;
let reruns = 0;
graph.onNodeChanged.on(() => {
  changes++;
});

const actions = registry.get(graph.actions(`${ROOT}/o0`));
if (actions.length !== ACTIONS) {
  throw new Error(`fixture expanded ${actions.length} actions, expected ${ACTIONS}`);
}

afterAll(() => {
  // eslint-disable-next-line no-console
  console.log(`node changes per re-run: ${(changes / Math.max(reruns, 1)).toFixed(1)} (${reruns} re-runs)`);
});

describe('app-graph re-offer', { tags: ['manual'], timeout: 120_000 }, () => {
  bench(
    `re-run ${OBJECTS} objects × ${ACTIONS} unchanged actions`,
    async () => {
      registry.set(revision, registry.get(revision) + 1);
      await GraphBuilder.flush(builder);
      reruns++;
    },
    BENCH_OPTIONS,
  );
});
