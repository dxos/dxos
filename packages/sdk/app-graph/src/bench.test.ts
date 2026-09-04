//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { afterAll, describe, test } from 'vitest';

import * as GraphNode from '@dxos/graph/GraphNode';

import * as Graph from './AppGraph';
import * as GraphBuilder from './AppGraphBuilder';

//
// Timings for the operations the app graph does on the render path. Skipped by default — these
// measure rather than assert, so they must never gate a merge; run them with:
//
//   moon run app-graph:test -- src/bench.test.ts --testNamePattern . --no-file-parallelism
//
// after flipping `describe.skip` to `describe`.
//
// Written against the public API only, so the same file runs against a pre-refactor checkout with
// the import block above rewritten to `./graph`, `./graph-builder`, `./node` (where `RootId` lived
// on the app node module) and `expandSync` renamed back to `expand`. That is how the before/after
// table in the project DESIGN.md was taken.
//

const ROOT = GraphNode.RootId;
const EXAMPLE_TYPE = 'org.dxos.type.example';

/** Node counts; large enough to dominate harness noise, small enough for a run to stay seconds. */
const WIDE = 1_000;
const PARENTS = 100;
const CHILDREN = 10;
const UPDATES = 50;
const MOUNTED = 200;

const results: { name: string; ms: number; unit: string }[] = [];

/**
 * Best of `runs`, since the numbers are compared across checkouts and the minimum is the stablest.
 * `prepare` builds the state each run needs without its cost landing in the measurement.
 */
const measure = async <T>(
  name: string,
  unit: string,
  run: (prepared: T) => Promise<void> | void,
  { runs = 3, prepare }: { runs?: number; prepare?: () => Promise<T> | T } = {},
): Promise<void> => {
  let best = Infinity;
  for (let index = 0; index < runs; index++) {
    const prepared = (await prepare?.()) as T;
    const started = performance.now();
    await run(prepared);
    best = Math.min(best, performance.now() - started);
  }
  results.push({ name, ms: best, unit });
};

const nodeArgs = (count: number, prefix = 'n') =>
  Array.from({ length: count }, (_, index) => ({ id: `${prefix}${index}`, type: EXAMPLE_TYPE, data: index }));

/** Root fans out to `PARENTS`, each of which fans out to `CHILDREN`. */
const treeConnector: GraphBuilder.ConnectorExtension = (node) =>
  Atom.make((get) =>
    Option.match(get(node), {
      onNone: () => [],
      onSome: (source) => (source.id === ROOT ? nodeArgs(PARENTS, 'p') : nodeArgs(CHILDREN, 'c')),
    }),
  );

/** A builder with one connector producing `nodes` under every node it is asked about. */
const setup = (connector: GraphBuilder.ConnectorExtension) => {
  const registry = Registry.make();
  const builder = GraphBuilder.make({ registry });
  GraphBuilder.addExtension(builder, GraphBuilder.createExtensionRaw({ id: 'bench', connector }));
  return { registry, builder, graph: builder.graph };
};

describe.skip('app-graph benchmark', { timeout: 300_000 }, () => {
  afterAll(() => {
    const width = Math.max(...results.map(({ name }) => name.length));
    // eslint-disable-next-line no-console
    console.log(
      ['', 'app-graph benchmark', '']
        .concat(
          results.map(({ name, ms, unit }) => `  ${name.padEnd(width)}  ${ms.toFixed(2).padStart(9)} ms  ${unit}`),
        )
        .join('\n'),
    );
  });

  test('expand: a connector producing N nodes', async () => {
    const nodes = nodeArgs(WIDE);
    await measure(
      `expand ${WIDE} nodes`,
      `${WIDE} nodes`,
      async ({ builder, graph }) => {
        Graph.expandSync(graph, ROOT, 'child');
        await GraphBuilder.flush(builder);
      },
      { prepare: () => setup(() => Atom.make(nodes)) },
    );
  });

  test('update: repeated connector re-runs over N nodes', async () => {
    const state = Atom.make(0).pipe(Atom.keepAlive);
    const { registry, builder, graph } = setup(() =>
      Atom.make((get) => nodeArgs(WIDE).map((node) => ({ ...node, data: node.data + get(state) }))),
    );
    Graph.expandSync(graph, ROOT, 'child');
    await GraphBuilder.flush(builder);

    await measure(`${UPDATES} connector updates @ ${WIDE} nodes`, `${UPDATES} flushes`, async () => {
      for (let index = 0; index < UPDATES; index++) {
        registry.set(state, registry.get(state) + 1);
        await GraphBuilder.flush(builder);
      }
    });
  });

  test('update: repeated re-runs with mounted connection atoms', async () => {
    const state = Atom.make(0).pipe(Atom.keepAlive);
    const { registry, builder, graph } = setup(() =>
      Atom.make((get) => nodeArgs(WIDE).map((node) => ({ ...node, data: node.data + get(state) }))),
    );
    Graph.expandSync(graph, ROOT, 'child');
    await GraphBuilder.flush(builder);

    // Mount a slice of the graph, as a rendered nav tree would.
    const cancels = registry
      .get(graph.connections(ROOT, 'child'))
      .slice(0, MOUNTED)
      .map((node) => registry.subscribe(graph.connections(node.id, 'child'), () => {}));

    await measure(`${UPDATES} updates @ ${MOUNTED} mounted atoms`, `${UPDATES} flushes`, async () => {
      for (let index = 0; index < UPDATES; index++) {
        registry.set(state, registry.get(state) + 1);
        await GraphBuilder.flush(builder);
      }
    });

    cancels.forEach((cancel) => cancel());
  });

  test('expand: a two-level tree', async () => {
    await measure(
      `expand ${PARENTS}x${CHILDREN} tree`,
      `${PARENTS * CHILDREN} nodes`,
      async ({ builder, graph }) => {
        Graph.expandSync(graph, ROOT, 'child');
        await GraphBuilder.flush(builder);
        for (const parent of nodeArgs(PARENTS, 'p')) {
          Graph.expandSync(graph, `${ROOT}/${parent.id}`, 'child');
        }
        await GraphBuilder.flush(builder);
      },
      { prepare: () => setup(treeConnector) },
    );
  });

  test('read: connections and node atoms', async () => {
    const nodes = nodeArgs(WIDE);
    const { registry, builder, graph } = setup(() => Atom.make(nodes));
    Graph.expandSync(graph, ROOT, 'child');
    await GraphBuilder.flush(builder);
    const ids = registry.get(graph.connections(ROOT, 'child')).map(({ id }) => id);

    await measure(`read connections() x ${WIDE}`, `${WIDE} reads`, () => {
      for (const id of ids) {
        registry.get(graph.connections(id, 'child'));
      }
    });

    await measure(`read node() x ${WIDE}`, `${WIDE} reads`, () => {
      for (const id of ids) {
        registry.get(graph.node(id));
      }
    });

    await measure(`getNode() x ${WIDE}`, `${WIDE} reads`, () => {
      for (const id of ids) {
        Graph.getNode(graph, id);
      }
    });
  });

  test('traverse and path', async () => {
    const { builder, graph } = setup(treeConnector);
    Graph.expandSync(graph, ROOT, 'child');
    await GraphBuilder.flush(builder);
    for (const parent of nodeArgs(PARENTS, 'p')) {
      Graph.expandSync(graph, `${ROOT}/${parent.id}`, 'child');
    }
    await GraphBuilder.flush(builder);

    await measure(`traverse ${PARENTS * CHILDREN} nodes`, 'whole graph', () => {
      Graph.traverse(graph, { relation: 'child', visitor: () => {} });
    });

    const target = `${ROOT}/p${PARENTS - 1}/c${CHILDREN - 1}`;
    await measure('getPath root -> leaf', '1 path', () => {
      Graph.getPath(graph, { target });
    });
  });

  test('remove: a connector dropping all its nodes', async () => {
    // Expansion is prepared per run, so the measurement is the removal alone.
    await measure(
      `remove ${WIDE} nodes`,
      `${WIDE} nodes`,
      async ({ registry, builder, state }) => {
        registry.set(state, []);
        await GraphBuilder.flush(builder);
      },
      {
        prepare: async () => {
          const state = Atom.make(nodeArgs(WIDE)).pipe(Atom.keepAlive);
          const { registry, builder, graph } = setup(() => Atom.make((get) => get(state)));
          Graph.expandSync(graph, ROOT, 'child');
          await GraphBuilder.flush(builder);
          return { registry, builder, state };
        },
      },
    );
  });

  test('remove: a materialized subtree, every level expanded', async () => {
    // The flat case above expands one relation, so it does not price what removal costs per node
    // that holds an expansion subscription of its own — which is every node a rendered tree reaches.
    await measure(
      `remove ${PARENTS}x${CHILDREN} tree`,
      `${PARENTS * CHILDREN} nodes, ${PARENTS + 1} expanded`,
      async ({ registry, builder, state }) => {
        registry.set(state, false);
        await GraphBuilder.flush(builder);
      },
      {
        prepare: async () => {
          const state = Atom.make(true).pipe(Atom.keepAlive);
          const { registry, builder, graph } = setup((node) =>
            Atom.make((get) =>
              !get(state)
                ? []
                : Option.match(get(node), {
                    onNone: () => [],
                    onSome: (source) => (source.id === ROOT ? nodeArgs(PARENTS, 'p') : nodeArgs(CHILDREN, 'c')),
                  }),
            ),
          );
          Graph.expandSync(graph, ROOT, 'child');
          await GraphBuilder.flush(builder);
          for (const parent of nodeArgs(PARENTS, 'p')) {
            Graph.expandSync(graph, `${ROOT}/${parent.id}`, 'child');
          }
          await GraphBuilder.flush(builder);
          return { registry, builder, state };
        },
      },
    );
  });
});
