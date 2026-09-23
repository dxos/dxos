//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import { AtomEx } from '@dxos/effect';

import * as GraphBuilder from './GraphBuilder.ts';
import * as GraphNode from './GraphNode.ts';
import * as Retention from './Retention.ts';

const setup = (props: GraphBuilder.ModelProps<string> = {}) => {
  // The caller's registry when one is supplied — reads must go through the registry the builder
  // writes to, or they never see its version bumps.
  const registry = props.registry ?? Registry.make();
  const builder = new GraphBuilder.ModelGraphBuilder<string>({ registry, ...props });
  // App-graph schedules on macrotasks; on microtasks a collection a flush triggers drains before `await`
  // returns, which hides ordering bugs.
  builder._schedule = (callback) =>
    new Promise((resolve) =>
      setTimeout(() => {
        callback();
        resolve();
      }),
    );
  const children = (id: string, relation?: string) => registry.get(builder.children(id, relation)).map(({ id }) => id);
  return { registry, builder, model: builder.graph, children };
};

const nextTask = (ms = 0) => new Promise((resolve) => setTimeout(resolve, ms));

const connector =
  (
    nodes: GraphBuilder.ModelNodeArg[] | ((get: Atom.AtomContext) => GraphBuilder.ModelNodeArg[]),
  ): GraphBuilder.Connector<GraphBuilder.ModelNode, GraphBuilder.ModelNodeArg> =>
  () =>
    Atom.make((get) => (typeof nodes === 'function' ? nodes(get) : nodes));

describe('GraphBuilder', () => {
  test('a connector materializes nodes and edges on expansion', async () => {
    const { builder, model, children } = setup();
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a' }, { id: 'b' }]) });

    expect(children(GraphNode.RootId)).to.deep.equal([]);
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a', 'root/b']);
    expect(model.findNode('root/a')?.id).to.equal('root/a');
  });

  test('node ids are qualified against the node they were produced from', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) => Option.match(get(node), { onNone: () => [], onSome: () => [{ id: 'a' }] })),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(children('root/a')).to.deep.equal([]);
    await GraphBuilder.flush(builder);

    expect(children('root/a')).to.deep.equal(['root/a/a']);
  });

  test('a segment id containing the path separator is rejected, and its siblings are kept', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a/b' }, { id: 'c' }]) });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/c']);
  });

  test('a throwing extension loses only its own nodes', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, [
      {
        id: 'broken',
        connector: connector(() => {
          throw new Error('broken');
        }),
      },
      { id: 'children', connector: connector([{ id: 'a' }]) },
    ]);

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a']);
  });

  test('extensions on the same relation are applied in position order', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, [
      { id: 'last', position: 100, connector: connector([{ id: 'z' }]) },
      { id: 'first', position: 1, connector: connector([{ id: 'a' }]) },
    ]);

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a', 'root/z']);
  });

  test('siblings are ordered by their position property', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector([
        { id: 'a', properties: { position: 10 } },
        { id: 'b', properties: { position: 1 } },
      ]),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/b', 'root/a']);
  });

  test('only extensions declaring the expanded relation contribute', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, [
      { id: 'children', connector: connector([{ id: 'a' }]) },
      { id: 'siblings', relation: 'sibling', connector: connector([{ id: 'b' }]) },
    ]);

    children(GraphNode.RootId);
    children(GraphNode.RootId, 'sibling');
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a']);
    expect(children(GraphNode.RootId, 'sibling')).to.deep.equal(['root/b']);
  });

  test('a connector update adds and removes', async () => {
    const { registry, builder, children } = setup();
    const state = Atom.make(['a', 'b']).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => get(state).map((id) => ({ id }))),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/a', 'root/b']);

    registry.set(state, ['b', 'c']);
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/b', 'root/c']);
  });

  test("an update to a connector's output lands on a microtask, its first output on the scheduler", async () => {
    const { registry, builder, children } = setup();
    const state = Atom.make(['a', 'b']).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => get(state).map((id) => ({ id }))),
    });

    children(GraphNode.RootId);
    await Promise.resolve();
    expect(children(GraphNode.RootId)).to.deep.equal([]);
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/a', 'root/b']);

    registry.set(state, ['b', 'a']);
    await Promise.resolve();
    expect(children(GraphNode.RootId)).to.deep.equal(['root/b', 'root/a']);
  });

  test('an update flush stops at the frame budget and leaves the rest to the scheduler', async () => {
    const { registry, builder, children } = setup();
    let flushed = 0;
    builder._frameBudget = () => ({ hasTime: () => flushed < 1, spend: () => flushed++ });
    const first = Atom.make(['a']).pipe(Atom.keepAlive);
    const second = Atom.make(['b']).pipe(Atom.keepAlive);
    let secondRuns = 0;
    GraphBuilder.addExtension(builder, [
      { id: 'children', connector: connector((get) => get(first).map((id) => ({ id }))) },
      {
        id: 'siblings',
        relation: 'sibling',
        connector: connector((get) => {
          secondRuns++;
          return get(second).map((id) => ({ id }));
        }),
      },
    ]);

    children(GraphNode.RootId);
    children(GraphNode.RootId, 'sibling');
    await GraphBuilder.flush(builder);

    const runs = secondRuns;
    registry.set(first, ['c']);
    registry.set(second, ['d']);
    await Promise.resolve();
    expect(children(GraphNode.RootId)).to.deep.equal(['root/c']);
    expect(children(GraphNode.RootId, 'sibling')).to.deep.equal(['root/b']);
    // Past the budget the connector is not merely unapplied but unread.
    expect(secondRuns).to.equal(runs);

    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId, 'sibling')).to.deep.equal(['root/d']);
  });

  test('invalidations mark a connector dirty, and the flush reads it once', async () => {
    const { registry, builder, children } = setup();
    const state = Atom.make(0).pipe(Atom.keepAlive);
    let runs = 0;
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => {
        runs++;
        return [{ id: `a${get(state)}` }];
      }),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    const before = runs;

    for (let index = 1; index <= 10; index++) {
      registry.set(state, index);
    }
    expect(runs).to.equal(before);

    await GraphBuilder.flush(builder);
    expect(runs).to.equal(before + 1);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/a10']);
  });

  test('an atom batch write reads the connector once', async () => {
    const { registry, builder, children } = setup();
    const state = Atom.make(0).pipe(Atom.keepAlive);
    let runs = 0;
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => {
        runs++;
        return [{ id: `a${get(state)}` }];
      }),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    const before = runs;

    // A batch rebuilds the anchors while the connector is still dirty.
    Atom.batch(() => registry.set(state, 1));
    await GraphBuilder.flush(builder);
    await nextTask();
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a1']);
    expect(runs).to.be.at.most(before + 2);
  });

  test.each([
    ['without an idle TTL', () => Registry.make()],
    ['with an idle TTL', () => AtomEx.makeRegistry({ idleTTL: Duration.millis(1) })],
  ])('a connector keeps its inputs between flushes, %s', async (_, makeRegistry) => {
    const { registry, builder, children } = setup({ registry: makeRegistry() });
    const source = Atom.make(['a']).pipe(Atom.keepAlive);
    const other = Atom.make(0).pipe(Atom.keepAlive);
    const sibling = Atom.make(0).pipe(Atom.keepAlive);
    let inputRuns = 0;
    const input = Atom.make((get) => {
      inputRuns++;
      return get(source);
    });
    GraphBuilder.addExtension(builder, [
      { id: 'children', connector: connector((get) => [...get(input), `b${get(other)}`].map((id) => ({ id }))) },
      { id: 'siblings', relation: 'sibling', connector: connector((get) => [{ id: `s${get(sibling)}` }]) },
    ]);

    children(GraphNode.RootId);
    children(GraphNode.RootId, 'sibling');
    await GraphBuilder.flush(builder);
    const before = inputRuns;

    // A connector the registry had dropped would rebuild `input` when read again.
    for (let index = 1; index <= 3; index++) {
      registry.set(sibling, index);
      await GraphBuilder.flush(builder);
      await nextTask(10);
    }
    registry.set(other, 1);
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a', 'root/b1']);
    expect(inputRuns).to.equal(before);
  });

  test('an unrelated node changing leaves a connector alone', async () => {
    const { registry, builder, model, children } = setup();
    let runs = 0;
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) => {
          get(node);
          runs++;
          return [{ id: 'a' }];
        }),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    const before = runs;

    // A sibling subtree changing must not re-run the root's connector: the node view cuts off at the
    // node itself, which is what keeps expansion from cascading across the whole graph.
    model.addNode({ id: 'unrelated' });
    registry.get(builder.children(GraphNode.RootId));
    await GraphBuilder.flush(builder);

    expect(runs).to.equal(before);
  });

  test('an unchanged re-read is not flushed', async () => {
    const { registry, builder, model, children } = setup({
      unchanged: (prev, next) => prev.length === next.length && prev.every((node, index) => node.id === next[index].id),
    });
    const state = Atom.make(0).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => {
        get(state);
        return [{ id: 'a' }];
      }),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    const version = registry.get(model.version);

    // Same nodes out of a re-run connector: nothing reaches the model, so its version does not move.
    registry.set(state, 1);
    await GraphBuilder.flush(builder);
    expect(registry.get(model.version)).to.equal(version);
  });

  test('an extension registered after expansion still contributes', async () => {
    const { builder, children } = setup();
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'late' }]) });
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/late']);
  });

  test('removing an extension removes the nodes it produced', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a' }]) });
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    GraphBuilder.removeExtension(builder, 'children');
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal([]);
  });

  test('inline descendants are materialized, and stale ones are removed', async () => {
    const { registry, builder, model, children } = setup();
    const state = Atom.make('x').pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => [{ id: 'a', nodes: [{ id: get(state), nodes: [{ id: 'deep' }] }] }]),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(model.findNode('root/a/x')?.id).to.equal('root/a/x');
    // Qualification recurses to every depth, not just the first inline level.
    expect(model.findNode('root/a/x/deep')?.id).to.equal('root/a/x/deep');

    registry.set(state, 'y');
    await GraphBuilder.flush(builder);
    expect(model.findNode('root/a/x')).to.be.undefined;
    expect(model.findNode('root/a/x/deep')).to.be.undefined;
    expect(model.findNode('root/a/y/deep')?.id).to.equal('root/a/y/deep');
  });

  test('every produced node passes through the decorator with its producing extension', async () => {
    const { builder, model, children } = setup({
      decorateNode: (node, extension) => ({ ...node, properties: { ...node.properties, tag: extension?.meta } }),
    });
    GraphBuilder.addExtension(builder, { id: 'children', meta: 'tagged', connector: connector([{ id: 'a' }]) });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(model.findNode('root/a')?.properties?.tag).to.equal('tagged');
  });

  test('destroy releases the expansion subscriptions', async () => {
    const { registry, builder, children } = setup();
    const state = Atom.make(['a']).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => get(state).map((id) => ({ id }))),
    });
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    GraphBuilder.destroy(builder);
    registry.set(state, ['a', 'b']);
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a']);
  });

  test('explore visits and materializes the nodes it reaches', async () => {
    const { builder, model } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: (): GraphBuilder.ModelNodeArg[] => [],
            onSome: (source) => (source.id.split(GraphNode.PathSeparator).length < 3 ? [{ id: 'a' }] : []),
          }),
        ),
    });

    const visited: string[] = [];
    await GraphBuilder.explore(builder, { relation: 'child', visitor: (node) => void visited.push(node.id) });

    expect(visited).to.deep.equal([GraphNode.RootId, 'root/a', 'root/a/a']);
    expect(model.findNode('root/a/a')?.id).to.equal('root/a/a');
  });

  test('explore stops descending when the visitor returns false', async () => {
    const { builder } = setup();
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a' }]) });

    const visited: string[] = [];
    await GraphBuilder.explore(builder, {
      relation: 'child',
      visitor: (node) => {
        visited.push(node.id);
        return false;
      },
    });

    expect(visited).to.deep.equal([GraphNode.RootId]);
  });

  test('flattenExtensions flattens arbitrary nesting', () => {
    const extension = (id: string) => ({ id });
    expect(
      GraphBuilder.flattenExtensions<{ id: string }>([extension('a'), [extension('b'), [extension('c')]]]).map(
        ({ id }) => id,
      ),
    ).to.deep.equal(['a', 'b', 'c']);
  });

  test('createConnector runs the factory only for matching nodes', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: GraphBuilder.createConnector<GraphBuilder.ModelNode, GraphBuilder.ModelNodeArg, string>(
        (node) => (node.id === GraphNode.RootId ? Option.some(node.id) : Option.none()),
        (id) => [{ id: `from-${id}` }],
      ),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/from-root']);

    expect(children('root/from-root')).to.deep.equal([]);
    await GraphBuilder.flush(builder);
    expect(children('root/from-root')).to.deep.equal([]);
  });

  test('a supplied model is built into, and its existing nodes are left alone', async () => {
    const registry = Registry.make();
    const model = GraphBuilder.makeModel({ registry });
    model.addNode({ id: 'seeded' });

    const { builder, children } = setup({ registry, model });
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a' }]) });
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(model.findNode('seeded')?.id).to.equal('seeded');
    expect(children(GraphNode.RootId)).to.deep.equal(['root/a']);
  });
});

describe('retention', () => {
  const ATTACHED = ['action', 'companion'];

  const tree = () => {
    const harness = setup();
    const produce = (relation: string, nodes: (id: string) => GraphBuilder.ModelNodeArg[]) =>
      GraphBuilder.addExtension(harness.builder, {
        id: relation,
        relation,
        connector: (node) =>
          Atom.make((get) => Option.match(get(node), { onNone: () => [], onSome: (source) => nodes(source.id) })),
      });
    const depth = (id: string) => id.split('/').length;
    produce('child', (id) =>
      depth(id) === 1 ? [{ id: 'w0' }, { id: 'w1' }] : depth(id) < 4 ? [{ id: 'c0' }, { id: 'c1' }] : [],
    );
    produce('action', (id) => (depth(id) === 1 ? [{ id: 'ra' }] : depth(id) === 2 ? [{ id: 'a' }] : []));
    produce('companion', (id) => (depth(id) === 1 ? [{ id: 'rk' }] : id.endsWith('/c0') ? [{ id: 'k' }] : []));
    return harness;
  };

  const expand = async ({ builder, children }: ReturnType<typeof setup>, ids: readonly string[]) => {
    for (const id of ids) {
      children(id);
      children(id, 'action');
      children(id, 'companion');
      await GraphBuilder.flush(builder);
    }
  };

  const loaded = async () => {
    const harness = tree();
    await expand(harness, [
      GraphNode.RootId,
      'root/w0',
      'root/w1',
      'root/w0/c0',
      'root/w0/c1',
      'root/w1/c0',
      'root/w1/c1',
    ]);
    const retain = async (...answers: (readonly Retention.Region[])[]) => {
      const atoms = answers.map((regions) => Atom.make(regions).pipe(Atom.keepAlive));
      GraphBuilder.setRetention(
        harness.builder,
        atoms.map((retained) => ({ retained, attached: ATTACHED })),
      );
      await GraphBuilder.flush(harness.builder);
      return atoms;
    };
    const present = (id: string) => harness.model.findNode(id) !== undefined;
    return { ...harness, retain, present };
  };

  test('nothing is collected while no retention is installed', async () => {
    const { builder, present } = await loaded();
    GraphBuilder.setRetention(builder, []);
    await GraphBuilder.flush(builder);
    expect(present('root/w1/c0/c0')).to.be.true;
  });

  test('what no retention reaches is released, and the root keeps its children, actions and companions', async () => {
    const { builder, retain, present } = await loaded();
    await retain([]);

    expect(present('root/ra')).to.be.true;
    expect(present('root/rk')).to.be.true;
    expect(present('root/w0/a')).to.be.true;
    expect(present('root/w0/c0')).to.be.false;
  });

  test('a collection pending when the retentions are removed releases nothing', async () => {
    const { builder, retain, registry, present } = await loaded();
    const [answer] = await retain([{ id: 'root/w0' }]);
    registry.set(answer, []);
    GraphBuilder.setRetention(builder, []);
    await GraphBuilder.flush(builder);
    expect(present('root/w0/c0')).to.be.true;
  });

  test('depth counts structural levels, and targets of other relations go with their source', async () => {
    const { retain, present } = await loaded();
    await retain([{ id: 'root/w1', depth: 1 }]);

    expect(present('root/w0')).to.be.true;
    expect(present('root/w0/a')).to.be.true;
    expect(present('root/w0/c0')).to.be.false;
    expect(present('root/w1/c0/k')).to.be.true;
    expect(present('root/w1/c0/c0')).to.be.false;
  });

  test('a relation no retention names as attached costs a level like any other', async () => {
    const harness = await loaded();
    const answer = Atom.make<readonly Retention.Region[]>([{ id: 'root/w1', depth: 1 }]).pipe(Atom.keepAlive);
    GraphBuilder.setRetention(harness.builder, [{ retained: answer, attached: ['companion'] }]);
    await GraphBuilder.flush(harness.builder);

    expect(harness.present('root/w1/c0/k')).to.be.true;
    expect(harness.present('root/w0/a')).to.be.false;
  });

  test('the deepest ask across retentions wins', async () => {
    const { retain, present } = await loaded();
    await retain(
      [{ id: 'root/w1' }],
      [
        { id: GraphNode.RootId, depth: 1 },
        { id: 'root/w1', depth: 1 },
      ],
    );
    expect(present('root/w1/c0/c0')).to.be.true;
    expect(present('root/w0/c0')).to.be.false;
  });

  test('a node asked for below a released node goes with it', async () => {
    const { retain, present } = await loaded();
    await retain([{ id: 'root/w1/c0/c0' }]);
    expect(present('root/w1/c0/c0')).to.be.false;
  });

  test('a node a retained parent also holds stays', async () => {
    const harness = await loaded();
    harness.model.addEdge({ id: 'shared', type: 'child', source: 'root/w0', target: 'root/w1/c0', data: { order: 0 } });
    await harness.retain([{ id: 'root/w0' }]);
    expect(harness.present('root/w1/c0')).to.be.true;
    expect(harness.present('root/w1/c1')).to.be.false;
  });

  test('a node expanded again under the same answer stays loaded until the answer changes', async () => {
    const harness = await loaded();
    const { registry, retain, children } = harness;
    const [answer] = await retain([{ id: 'root/w0' }]);
    expect(children('root/w1')).to.deep.equal([]);

    await expand(harness, ['root/w1']);
    registry.set(answer, [{ id: 'root/w0' }]);
    await GraphBuilder.flush(harness.builder);
    expect(children('root/w1')).to.deep.equal(['root/w1/c0', 'root/w1/c1']);

    registry.set(answer, []);
    await GraphBuilder.flush(harness.builder);
    expect(children('root/w0')).to.deep.equal([]);
    expect(children('root/w1')).to.deep.equal([]);
  });

  test('flush waits for a collection the flush itself triggers', async () => {
    const harness = setup();
    const { builder, registry, children } = harness;
    const ids = Atom.make(['w0', 'w1']).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: (): GraphBuilder.ModelNodeArg[] => [],
            onSome: (source) => (source.id === GraphNode.RootId ? get(ids).map((id) => ({ id })) : [{ id: 'c0' }]),
          }),
        ),
    });
    await expand(harness, [GraphNode.RootId, 'root/w0']);

    GraphBuilder.setRetention(builder, [
      {
        retained: Atom.make((get) =>
          get(builder.children(GraphNode.RootId)).some(({ id }) => id === 'root/w2') ? [] : [{ id: 'root/w0' }],
        ),
      },
    ]);
    await GraphBuilder.flush(builder);
    expect(children('root/w0')).to.deep.equal(['root/w0/c0']);

    registry.set(ids, ['w0', 'w1', 'w2']);
    await GraphBuilder.flush(builder);
    expect(children('root/w0')).to.deep.equal([]);
  });

  test('a released node keeps the inline children it was emitted with, and its producer stays live', async () => {
    const harness = setup();
    const { builder, registry, children } = harness;
    const ids = Atom.make(['w']).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: (): GraphBuilder.ModelNodeArg[] => [],
            onSome: (source) =>
              source.id === GraphNode.RootId
                ? get(ids).map((id) => ({ id, nodes: [{ id: 'x' }] }))
                : source.id === 'root/w/x'
                  ? [{ id: 'y' }]
                  : [],
          }),
        ),
    });
    await expand(harness, [GraphNode.RootId, 'root/w/x']);
    expect(children('root/w/x')).to.deep.equal(['root/w/x/y']);

    GraphBuilder.setRetention(builder, [{ retained: Atom.make([]) }]);
    await GraphBuilder.flush(builder);
    expect(children('root/w')).to.deep.equal(['root/w/x']);
    expect(children('root/w/x')).to.deep.equal([]);

    registry.set(ids, ['w', 'v']);
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/w', 'root/v']);
  });
});
