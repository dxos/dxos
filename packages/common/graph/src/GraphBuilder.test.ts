//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import * as GraphBuilder from './GraphBuilder';
import * as GraphNode from './GraphNode';

const setup = (props: GraphBuilder.ModelProps<string> = {}) => {
  // The caller's registry when one is supplied — reads must go through the registry the builder
  // writes to, or they never see its version bumps.
  const registry = props.registry ?? Registry.make();
  const builder = new GraphBuilder.ModelGraphBuilder<string>({ registry, ...props });
  const children = (id: string, relation?: string) => registry.get(builder.children(id, relation)).map(({ id }) => id);
  return { registry, builder, model: builder.graph, children };
};

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

  test('a segment id containing the path separator is rejected', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a/b' }]) });

    expect(() => children(GraphNode.RootId)).to.throw(/must not contain/);
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

  test('nodes are attributed to the extension that produced them, inline descendants included', async () => {
    const { builder, children } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector([{ id: 'a', nodes: [{ id: 'inline' }] }]),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(builder.getNodeExtensionId('root/a')).to.equal('children');
    expect(builder.getNodeExtensionId('root/a/inline')).to.equal('children');
    expect(builder.getNodeExtensionId(GraphNode.RootId)).to.be.undefined;
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
