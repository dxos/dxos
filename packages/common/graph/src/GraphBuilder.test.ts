//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, expect, test } from 'vitest';

import * as GraphBuilder from './GraphBuilder';
import * as GraphNode from './GraphNode';

//
// A minimal store, standing in for whatever graph a caller drives the builder over (`@dxos/app-graph`
// drives an atom-backed app graph). Keeping it in the test is the point: it is what proves the engine
// needs nothing beyond the `Store` port.
//

type TestNode = { readonly id: string; readonly type?: string; readonly properties?: Record<string, any> };

type TestArg = TestNode & { readonly nodes?: TestArg[] };

const edgeKey = (source: string, relation: string) => `${source}::${relation}`;

class TestStore implements GraphBuilder.Store<TestNode, TestArg, TestStore> {
  readonly graph = this;
  readonly expanded = new Set<string>();
  readonly removed: string[] = [];

  readonly #registry: Registry.AtomRegistry;
  readonly #hooks: GraphBuilder.StoreHooks;
  // State lives outside the registry, with a version atom as the invalidation doorbell, so a read
  // through a foreign registry (as `explore` does) still sees it.
  readonly #values = new Map<string, TestNode>();
  readonly #targets = new Map<string, string[]>();
  readonly #version = Atom.make(0).pipe(Atom.keepAlive);
  readonly #nodes = Atom.family<string, Atom.Atom<Option.Option<TestNode>>>((id) =>
    Atom.make((get) => {
      get(this.#version);
      const node = this.#values.get(id);
      return node ? Option.some(node) : Option.none();
    }).pipe(
      // Cut off at the node itself: the version atom invalidates every node view on every write, and
      // without this a connector would re-run (and re-flush) on writes to unrelated nodes, forever.
      Atom.withEquality(
        (a: Option.Option<TestNode>, b: Option.Option<TestNode>) =>
          Option.getOrUndefined(a) === Option.getOrUndefined(b),
      ),
    ),
  );
  readonly #edges = Atom.family<string, Atom.Atom<string[]>>((key) =>
    Atom.make((get) => {
      get(this.#version);
      return this.#targets.get(key) ?? [];
    }),
  );

  constructor(registry: Registry.AtomRegistry, hooks: GraphBuilder.StoreHooks) {
    this.#registry = registry;
    this.#hooks = hooks;
  }

  #touch(): void {
    this.#registry.set(this.#version, this.#registry.get(this.#version) + 1);
  }

  node(id: string): Atom.Atom<Option.Option<TestNode>> {
    return this.#nodes(id);
  }

  nodeOrThrow(id: string): Atom.Atom<TestNode> {
    return Atom.make((get) => Option.getOrThrowWith(get(this.#nodes(id)), () => new Error(`No node: ${id}`)));
  }

  addNodes(nodes: readonly TestArg[]): void {
    for (const { nodes: children, ...node } of nodes) {
      this.#values.set(node.id, node);
      // Inline descendants enter the graph with their parent; the builder only hands over the top level.
      this.addNodes(children ?? []);
    }
    this.#touch();
  }

  removeNodes(ids: readonly string[], _edges?: boolean): void {
    for (const id of ids) {
      this.removed.push(id);
      this.#values.delete(id);
      this.#hooks.onRemoveNode(id);
    }
    this.#touch();
  }

  addEdges(edges: readonly GraphBuilder.Edge[]): void {
    for (const { source, target, relation } of edges) {
      const key = edgeKey(source, relation);
      const targets = this.#targets.get(key) ?? [];
      if (!targets.includes(target)) {
        this.#targets.set(key, [...targets, target]);
      }
    }
    this.#touch();
  }

  removeEdges(edges: readonly GraphBuilder.Edge[], _removeOrphans?: boolean): void {
    for (const { source, target, relation } of edges) {
      const key = edgeKey(source, relation);
      this.#targets.set(
        key,
        (this.#targets.get(key) ?? []).filter((id) => id !== target),
      );
    }
    this.#touch();
  }

  sortEdges(id: string, relation: string, order: readonly string[]): void {
    this.#targets.set(edgeKey(id, relation), [...order]);
    this.#touch();
  }

  setNode(id: string, node: Option.Option<TestNode>): void {
    Option.match(node, { onNone: () => this.#values.delete(id), onSome: (value) => this.#values.set(id, value) });
    this.#touch();
  }

  constructNode(node: TestArg): Option.Option<TestNode> {
    const { nodes: _, ...rest } = node;
    return Option.some(rest);
  }

  //
  // Test surface.
  //

  /** Seed a node the builder did not produce (the root, typically). */
  seed(node: TestNode): void {
    this.#values.set(node.id, node);
    this.#touch();
  }

  /** Read a relation's targets, expanding it the first time — the app graph's `connections` analog. */
  children(id: string, relation = 'child'): string[] {
    const key = edgeKey(id, relation);
    if (!this.expanded.has(key)) {
      this.expanded.add(key);
      this.#hooks.onExpand(id, relation);
    }
    return this.#registry.get(this.#edges(key));
  }

  get(id: string): TestNode | undefined {
    return this.#values.get(id);
  }
}

const setup = (props: Partial<GraphBuilder.Props<TestNode, TestArg, string, string, TestStore>> = {}) => {
  const registry = Registry.make();
  const builder = GraphBuilder.make<TestNode, TestArg, string, string, TestStore>({
    registry,
    relationKey: (relation) => relation ?? 'child',
    inline: {
      children: (node) => node.nodes ?? [],
      map: (node, fn) => ({ ...node, nodes: node.nodes?.map(fn) }),
    },
    store: (hooks) => new TestStore(registry, hooks),
    ...props,
  });
  builder.graph.seed({ id: GraphNode.RootId });
  return { registry, builder, store: builder.graph };
};

const connector =
  (nodes: TestArg[] | ((get: Atom.AtomContext) => TestArg[])): GraphBuilder.Connector<TestNode, TestArg> =>
  () =>
    Atom.make((get) => (typeof nodes === 'function' ? nodes(get) : nodes));

describe('GraphBuilder', () => {
  test('a connector materializes nodes and edges on expansion', async () => {
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a' }, { id: 'b' }]) });

    expect(store.children(GraphNode.RootId)).to.deep.equal([]);
    await GraphBuilder.flush(builder);

    expect(store.children(GraphNode.RootId)).to.deep.equal(['root/a', 'root/b']);
    expect(store.get('root/a')?.id).to.equal('root/a');
  });

  test('node ids are qualified against the node they were produced from', async () => {
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) => Option.match(get(node), { onNone: () => [], onSome: () => [{ id: 'a' }] })),
    });

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(store.children('root/a')).to.deep.equal([]);
    await GraphBuilder.flush(builder);

    expect(store.children('root/a')).to.deep.equal(['root/a/a']);
  });

  test('a segment id containing the path separator is rejected', async () => {
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a/b' }]) });

    expect(() => store.children(GraphNode.RootId)).to.throw(/must not contain/);
  });

  test('extensions on the same relation are applied in position order', async () => {
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, [
      { id: 'last', position: 100, connector: connector([{ id: 'z' }]) },
      { id: 'first', position: 1, connector: connector([{ id: 'a' }]) },
    ]);

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(store.children(GraphNode.RootId)).to.deep.equal(['root/a', 'root/z']);
  });

  test('siblings are ordered by their position property', async () => {
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector([
        { id: 'a', properties: { position: 10 } },
        { id: 'b', properties: { position: 1 } },
      ]),
    });

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(store.children(GraphNode.RootId)).to.deep.equal(['root/b', 'root/a']);
  });

  test('only extensions declaring the expanded relation contribute', async () => {
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, [
      { id: 'children', connector: connector([{ id: 'a' }]) },
      { id: 'siblings', relation: 'sibling', connector: connector([{ id: 'b' }]) },
    ]);

    store.children(GraphNode.RootId);
    store.children(GraphNode.RootId, 'sibling');
    await GraphBuilder.flush(builder);

    expect(store.children(GraphNode.RootId)).to.deep.equal(['root/a']);
    expect(store.children(GraphNode.RootId, 'sibling')).to.deep.equal(['root/b']);
  });

  test('a connector update adds and removes', async () => {
    const { registry, builder, store } = setup();
    const state = Atom.make(['a', 'b']).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => get(state).map((id) => ({ id }))),
    });

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(store.children(GraphNode.RootId)).to.deep.equal(['root/a', 'root/b']);

    registry.set(state, ['b', 'c']);
    await GraphBuilder.flush(builder);
    expect(store.children(GraphNode.RootId)).to.deep.equal(['root/b', 'root/c']);
  });

  test('an extension registered after expansion still contributes', async () => {
    const { builder, store } = setup();
    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'late' }]) });
    await GraphBuilder.flush(builder);

    expect(store.children(GraphNode.RootId)).to.deep.equal(['root/late']);
  });

  test('removing an extension removes the nodes it produced', async () => {
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a' }]) });
    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    GraphBuilder.removeExtension(builder, 'children');
    await GraphBuilder.flush(builder);

    expect(store.children(GraphNode.RootId)).to.deep.equal([]);
  });

  test('inline descendants are qualified, and stale ones are removed', async () => {
    const { registry, builder, store } = setup();
    const state = Atom.make('x').pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => [{ id: 'a', nodes: [{ id: get(state) }] }]),
    });

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(store.get('root/a/x')?.id).to.equal('root/a/x');

    registry.set(state, 'y');
    await GraphBuilder.flush(builder);
    expect(store.get('root/a/x')).to.be.undefined;
    expect(store.get('root/a/y')?.id).to.equal('root/a/y');
  });

  test('nodes are attributed to the extension that produced them, inline descendants included', async () => {
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector([{ id: 'a', nodes: [{ id: 'inline' }] }]),
    });

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(builder.getNodeExtensionId('root/a')).to.equal('children');
    expect(builder.getNodeExtensionId('root/a/inline')).to.equal('children');
    expect(builder.getNodeExtensionId(GraphNode.RootId)).to.be.undefined;
  });

  test('inline descendants excluded from `owned` do not inherit provenance', async () => {
    const { builder, store } = setup({
      inline: { children: (node) => node.nodes ?? [], map: (node) => node, owned: () => [] },
    });
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector([{ id: 'a', nodes: [{ id: 'inline' }] }]),
    });

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(builder.getNodeExtensionId('root/a')).to.equal('children');
    expect(builder.getNodeExtensionId('root/a/inline')).to.be.undefined;
  });

  test('every produced node passes through the decorator with its producing extension', async () => {
    const { builder, store } = setup({
      decorateNode: (node, extension) => ({ ...node, properties: { ...node.properties, tag: extension?.meta } }),
    });
    GraphBuilder.addExtension(builder, { id: 'children', meta: 'tagged', connector: connector([{ id: 'a' }]) });

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    expect(store.get('root/a')?.properties?.tag).to.equal('tagged');
  });

  test('an unchanged re-read is not flushed', async () => {
    const { registry, builder, store } = setup({
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

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    const removedBefore = store.removed.length;

    // Same nodes out of a re-run connector: nothing reaches the store.
    registry.set(state, 1);
    await GraphBuilder.flush(builder);
    expect(store.removed.length).to.equal(removedBefore);
  });

  test('destroy releases the expansion subscriptions', async () => {
    const { registry, builder, store } = setup();
    const state = Atom.make(['a']).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => get(state).map((id) => ({ id }))),
    });
    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    GraphBuilder.destroy(builder);
    registry.set(state, ['a', 'b']);
    await GraphBuilder.flush(builder);

    expect(store.children(GraphNode.RootId)).to.deep.equal(['root/a']);
  });

  test('explore visits and materializes the nodes it reaches', async () => {
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: (): TestArg[] => [],
            onSome: (source) => (source.id.split(GraphNode.PathSeparator).length < 3 ? [{ id: 'a' }] : []),
          }),
        ),
    });

    const visited: string[] = [];
    await GraphBuilder.explore(builder, { relation: 'child', visitor: (node) => void visited.push(node.id) });

    expect(visited).to.deep.equal([GraphNode.RootId, 'root/a', 'root/a/a']);
    expect(store.get('root/a/a')?.id).to.equal('root/a/a');
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
    const { builder, store } = setup();
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: GraphBuilder.createConnector<TestNode, TestArg, string>(
        (node) => (node.id === GraphNode.RootId ? Option.some(node.id) : Option.none()),
        (id) => [{ id: `from-${id}` }],
      ),
    });

    store.children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(store.children(GraphNode.RootId)).to.deep.equal(['root/from-root']);

    expect(store.children('root/from-root')).to.deep.equal([]);
    await GraphBuilder.flush(builder);
    expect(store.children('root/from-root')).to.deep.equal([]);
  });
});
