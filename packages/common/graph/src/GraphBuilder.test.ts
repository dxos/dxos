//
// Copyright 2026 DXOS.org
//

import * as Duration from 'effect/Duration';
import * as Option from 'effect/Option';
import * as Atom from 'effect/unstable/reactivity/Atom';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import * as fc from 'fast-check';
import { describe, expect, test, vi } from 'vitest';

import { AtomEx } from '@dxos/effect';
import { LogLevel, type LogProcessor, log } from '@dxos/log';

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

const connector = (
  nodes: GraphBuilder.ModelNodeArg[] | ((get: Atom.AtomContext) => GraphBuilder.ModelNodeArg[]),
): GraphBuilder.Connector<GraphBuilder.ModelNode, GraphBuilder.ModelNodeArg> =>
  // One atom per node, as `createExtensionRaw` does, so a connector re-run is not a rebuilt atom.
  Atom.family((_node: Atom.Atom<Option.Option<GraphBuilder.ModelNode>>) =>
    Atom.make((get) => (typeof nodes === 'function' ? nodes(get) : nodes)),
  );

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

  test.each([
    ['within the budget', true],
    ['past the budget', false],
  ])('an atom batch write reads the connector once and keeps its inputs, %s', async (_, hasTime) => {
    const { registry, builder, children } = setup();
    const state = Atom.make(0).pipe(Atom.keepAlive);
    let runs = 0;
    let inputRuns = 0;
    const input = Atom.make(() => ++inputRuns);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => {
        runs++;
        get(input);
        return [{ id: `a${get(state)}` }];
      }),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    const before = runs;

    // A batch rebuilds the connector and its anchor at once; past the budget nothing reads the connector
    // before the registry's removal tasks run.
    builder._frameBudget = () => ({ hasTime: () => hasTime, spend: () => {} });
    builder._schedule = (callback) => nextTask(20).then(callback);
    Atom.batch(() => registry.set(state, 1));
    await GraphBuilder.flush(builder);

    expect(children(GraphNode.RootId)).to.deep.equal(['root/a1']);
    expect(runs).to.equal(before + 1);
    expect(inputRuns).to.equal(1);
  });

  test('a connector keeps its inputs as other keys join its anchor or stay dirty', async () => {
    // More relations than anchors, so read keys share anchors with keys the budget leaves dirty.
    const RELATIONS = 100;
    const { registry, builder, children } = setup();
    const trigger = Atom.make(0).pipe(Atom.keepAlive);
    const inputRuns = new Map<number, number>();
    const read = new Set<number>();
    const inputs = Array.from({ length: RELATIONS }, (_, index) =>
      Atom.make(() => {
        inputRuns.set(index, (inputRuns.get(index) ?? 0) + 1);
        return index;
      }),
    );
    GraphBuilder.addExtension(
      builder,
      inputs.map((input, index) => ({
        id: `r${index}`,
        relation: `r${index}`,
        connector: connector((get) => {
          read.add(index);
          return [{ id: `n${get(input)}-${get(trigger)}` }];
        }),
      })),
    );
    // One at a time, so most join an anchor that already holds other keys.
    for (let index = 0; index < RELATIONS; index++) {
      children(GraphNode.RootId, `r${index}`);
      await GraphBuilder.flush(builder);
    }
    await nextTask();
    expect([...inputRuns.values()].every((runs) => runs === 1)).to.be.true;

    let reads = 0;
    builder._frameBudget = () => ({ hasTime: () => reads < RELATIONS / 4, spend: () => reads++ });
    // Later than the registry's removal tasks, so an unanchored connector would be gone by the flush.
    builder._schedule = (callback) => nextTask(20).then(callback);
    read.clear();
    registry.set(trigger, 1);
    await Promise.resolve();
    const readFirst = [...read];
    expect(readFirst.length).to.be.greaterThan(0).and.lessThan(RELATIONS);
    await GraphBuilder.flush(builder);

    for (const index of readFirst) {
      expect(inputRuns.get(index)).to.equal(1);
    }
  });

  test('expanding after destroy reads nothing', async () => {
    const { builder, children } = setup();
    let runs = 0;
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector(() => {
        runs++;
        return [{ id: 'a' }];
      }),
    });

    GraphBuilder.destroy(builder);
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    await nextTask(10);

    expect(runs).to.equal(0);
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

  test('a connector whose read throws is abandoned, not re-read', async () => {
    const { builder, children } = setup();
    let reads = 0;
    GraphBuilder.addExtension(builder, {
      id: 'broken',
      // Throws outside the per-extension catch, where the builder filters extensions by relation.
      get relation(): string {
        reads++;
        throw new Error('broken');
      },
      connector: connector([{ id: 'a' }]),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    await nextTask(10);
    await GraphBuilder.flush(builder);

    expect(reads).to.equal(1);
  });

  test('a node that returns is expanded afresh', async () => {
    const { registry, builder, children } = setup({
      unchanged: (prev, next) => JSON.stringify(prev) === JSON.stringify(next),
    });
    const present = Atom.make(true).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: () => [],
            onSome: ({ id }) =>
              id === GraphNode.RootId ? [{ id: 'a', nodes: get(present) ? [{ id: 'b' }] : [] }] : [{ id: 'x' }],
          }),
        ),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    children('root/a/b');
    await GraphBuilder.flush(builder);
    expect(children('root/a/b')).to.deep.equal(['root/a/b/x']);

    // The inline `b` is removed with its edges, then emitted again and re-expanded.
    registry.set(present, false);
    await GraphBuilder.flush(builder);
    registry.set(present, true);
    await GraphBuilder.flush(builder);
    children('root/a/b');
    await GraphBuilder.flush(builder);

    expect(children('root/a/b')).to.deep.equal(['root/a/b/x']);
  });

  test('an update read before its node was removed in the same flush is dropped', async () => {
    const { registry, builder, model, children } = setup();
    const moved = Atom.make(false).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: () => [],
            onSome: ({ id }) =>
              id === GraphNode.RootId ? (get(moved) ? [] : [{ id: 'a' }]) : get(moved) ? [{ id: 'y' }] : [],
          }),
        ),
    });

    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    children('root/a');
    await GraphBuilder.flush(builder);

    // One write drops `a` from the root and gives `a` a child: `a`'s update must not land under it.
    registry.set(moved, true);
    await GraphBuilder.flush(builder);

    expect(model.findNode('root/a')).to.be.undefined;
    expect(model.findNode('root/a/y')).to.be.undefined;
  });

  test('an idle builder keeps its connectors past the anchor idle TTL, and destroy lets them expire', async () => {
    vi.useFakeTimers();
    try {
      const { builder, registry, children } = setup();
      let inputRuns = 0;
      const input = Atom.make(() => ++inputRuns);
      GraphBuilder.addExtension(builder, { id: 'children', connector: connector((get) => [{ id: `a${get(input)}` }]) });
      const settle = async () => {
        const flushed = GraphBuilder.flush(builder);
        await vi.advanceTimersByTimeAsync(10);
        await flushed;
      };
      const anchors = () => [...registry.getNodes().values()].filter((node) => node.atom.idleTTL !== undefined).length;

      children(GraphNode.RootId);
      await settle();
      expect(anchors()).to.be.greaterThan(0);

      // Idle for several anchor lifetimes: a lapsed anchor would drop the connector and rebuild its input.
      await vi.advanceTimersByTimeAsync(5 * 60_000);
      await settle();
      expect(inputRuns).to.equal(1);

      GraphBuilder.destroy(builder);
      await vi.advanceTimersByTimeAsync(5 * 60_000);
      expect(anchors()).to.equal(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test('the anchors outlive a disposed registry quietly', async () => {
    vi.useFakeTimers();
    try {
      const { builder, registry, children } = setup();
      GraphBuilder.addExtension(builder, { id: 'children', connector: connector([{ id: 'a' }]) });
      children(GraphNode.RootId);
      const flushed = GraphBuilder.flush(builder);
      await vi.advanceTimersByTimeAsync(10);
      await flushed;

      // The builder is never destroyed: its heartbeat must stop, not throw, once the registry refuses it.
      registry.dispose();
      await vi.advanceTimersByTimeAsync(5 * 60_000);
      expect(vi.getTimerCount()).to.equal(0);
    } finally {
      vi.useRealTimers();
    }
  });

  test('a connector the flush dirties is read in the same flush', async () => {
    const { registry, builder, children } = setup();
    const label = Atom.make('x').pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: () => [],
            onSome: ({ id, properties }) =>
              id === GraphNode.RootId ? [{ id: 'a', properties: { label: get(label) } }] : [{ id: properties?.label }],
          }),
        ),
    });
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    children('root/a');
    await GraphBuilder.flush(builder);

    // Rewriting `a` dirties `a`'s own connector mid-flush; the same microtask reads it.
    registry.set(label, 'y');
    await Promise.resolve();
    expect(children('root/a')).to.deep.equal(['root/a/y']);
  });

  test("a relation torn down by release lets its connector's inputs go", async () => {
    const { registry, builder, children } = setup();
    const input = Atom.make(() => 'a');
    GraphBuilder.addExtension(builder, { id: 'children', connector: connector((get) => [{ id: get(input) }]) });
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(registry.getNodes().has(input)).to.be.true;

    // Releasing its output forgets the root's relation while its connector is still valid.
    GraphBuilder.release(builder, ['root/a']);
    await nextTask(10);
    expect(registry.getNodes().has(input)).to.be.false;
  });

  test("a throwing extension recovers when a sibling extension's input changes", async () => {
    const { registry, builder, children } = setup();
    const broken = Atom.make(true).pipe(Atom.keepAlive);
    const sibling = Atom.make(0).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, [
      {
        id: 'flaky',
        connector: connector((get) => {
          if (get(broken)) {
            throw new Error('broken');
          }
          return [{ id: 'f' }];
        }),
      },
      { id: 'steady', connector: connector((get) => [{ id: `s${get(sibling)}` }]) },
    ]);
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/s0']);

    registry.set(broken, false);
    await GraphBuilder.flush(builder);
    registry.set(sibling, 1);
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/f', 'root/s1']);
  });

  test('an update that removes its own node writes nothing more', async () => {
    const { registry, builder, model, children } = setup();
    const shown = Atom.make(true).pipe(Atom.keepAlive);
    const child = Atom.make('x').pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: (node) =>
        Atom.make((get) =>
          Option.match(get(node), {
            onNone: () => [],
            onSome: ({ id }) => (id === GraphNode.RootId ? (get(shown) ? [{ id: 'a' }] : []) : [{ id: get(child) }]),
          }),
        ),
    });
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);
    children('root/a');
    await GraphBuilder.flush(builder);

    // Dropped by the root, `a` stays while it has a child; replacing the child removes `a`'s last edge.
    registry.set(shown, false);
    await GraphBuilder.flush(builder);
    expect(model.findNode('root/a')).not.to.be.undefined;
    registry.set(child, 'y');
    await GraphBuilder.flush(builder);

    expect(model.findNode('root/a')).to.be.undefined;
    expect(model.findNode('root/a/y')).to.be.undefined;
    expect(builder._flushed.size).to.equal(1);
  });

  test('a store write that throws leaves the previous output to diff against', async () => {
    const { registry, builder, children } = setup();
    const state = Atom.make(['a']).pipe(Atom.keepAlive);
    GraphBuilder.addExtension(builder, {
      id: 'children',
      connector: connector((get) => get(state).map((id) => ({ id }))),
    });
    children(GraphNode.RootId);
    await GraphBuilder.flush(builder);

    const { removeEdges } = builder._store;
    builder._store.removeEdges = () => {
      throw new Error('store');
    };
    registry.set(state, ['b']);
    await GraphBuilder.flush(builder);
    builder._store.removeEdges = removeEdges;

    // Diffed against `a`, the output that last landed, so `a` goes.
    registry.set(state, ['c']);
    await GraphBuilder.flush(builder);
    expect(children(GraphNode.RootId)).to.deep.equal(['root/c']);
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

  test('destroy releases the tracked expansions', async () => {
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
    expect(builder._flushed.size).to.equal(0);
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

describe('model-based', () => {
  // Every connector's output is a pure function of a few sources, so the graph the builder settles on
  // can be checked against that function whatever order changes, expansions and releases came in.
  const SOURCES = 3;
  const DEPTH = 3;
  const RELATIONS = ['child', 'other'] as const;
  const ANCHOR_TTL = 60_000;

  type Command =
    | { kind: 'set'; source: number; value: number; batch: boolean }
    | { kind: 'expand'; pick: number; relation: (typeof RELATIONS)[number] }
    | { kind: 'release'; pick: number; relation: (typeof RELATIONS)[number] }
    | { kind: 'toggle' }
    | { kind: 'settle' }
    | { kind: 'advance'; ms: number };

  // Weighted towards expansion and settling, so the graph grows deep enough for changes to cascade.
  const command: fc.Arbitrary<Command> = fc.oneof(
    {
      weight: 3,
      arbitrary: fc.record({
        kind: fc.constant('set' as const),
        source: fc.nat(SOURCES - 1),
        value: fc.nat(5),
        batch: fc.boolean(),
      }),
    },
    {
      weight: 5,
      arbitrary: fc.record({
        kind: fc.constant('expand' as const),
        pick: fc.nat(),
        relation: fc.constantFrom(...RELATIONS),
      }),
    },
    {
      weight: 1,
      arbitrary: fc.record({
        kind: fc.constant('release' as const),
        pick: fc.nat(),
        relation: fc.constantFrom(...RELATIONS),
      }),
    },
    { weight: 1, arbitrary: fc.record({ kind: fc.constant('toggle' as const) }) },
    { weight: 3, arbitrary: fc.record({ kind: fc.constant('settle' as const) }) },
    {
      weight: 1,
      arbitrary: fc.record({
        kind: fc.constant('advance' as const),
        ms: fc.constantFrom(1_000, 31_000, 61_000, 300_000),
      }),
    },
  );

  const hash = (id: string) => [...id].reduce((acc, char) => (acc * 31 + char.charCodeAt(0)) >>> 0, 7);

  /** The segment ids `relation` of `id` holds for the given source values. */
  const segments = (id: string, relation: string, value: (source: number) => number): string[] => {
    if (id.split(GraphNode.PathSeparator).length > DEPTH) {
      return [];
    }
    return relation === 'child'
      ? Array.from({ length: value(hash(id) % SOURCES) % 3 }, (_, index) => `c${index}`)
      : [`o${value((hash(id) + 1) % SOURCES) % 2}`];
  };

  const run = async ({ ttl, budget, commands }: { ttl: boolean; budget?: number; commands: Command[] }) => {
    const realImmediate = globalThis.setImmediate;
    const turn = () => new Promise((resolve) => realImmediate(resolve));
    // The registry's removal tasks run on `setImmediate`, which stays real so settling can wait for them.
    vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'setInterval', 'clearInterval', 'Date'] });
    const logged: string[] = [];
    const collect: LogProcessor = (_, entry) => {
      if (entry.level >= LogLevel.WARN) {
        logged.push(entry.message ?? String(entry.error));
      }
    };
    const removeProcessor = log.addProcessor(collect);
    const registry = ttl ? AtomEx.makeRegistry({ idleTTL: Duration.seconds(5) }) : Registry.make();
    const { builder, model } = setup({ registry });
    try {
      if (budget !== undefined) {
        builder._frameBudget = () => {
          let reads = 0;
          return { hasTime: () => reads < budget, spend: () => void reads++ };
        };
      }

      const sources = Array.from({ length: SOURCES }, () => Atom.make(2).pipe(Atom.keepAlive));
      const connectors: Atom.Atom<unknown>[] = [];
      let reads = 0;
      const extension = (
        relation: string,
      ): GraphBuilder.Extension<GraphBuilder.ModelNode, GraphBuilder.ModelNodeArg, string, string> => ({
        id: relation,
        relation,
        connector: Atom.family((node: Atom.Atom<Option.Option<GraphBuilder.ModelNode>>) => {
          const atom = Atom.make((get) => {
            reads++;
            return Option.match(get(node), {
              onNone: () => [],
              onSome: ({ id }) => segments(id, relation, (source) => get(sources[source])).map((id) => ({ id })),
            });
          });
          connectors.push(atom);
          return atom;
        }),
      });
      GraphBuilder.addExtension(builder, [extension('child'), extension('other')]);
      let other = true;

      const settle = async () => {
        for (let index = 0; index < 100; index++) {
          const flushed = GraphBuilder.flush(builder);
          await vi.advanceTimersByTimeAsync(1);
          await flushed;
          await turn();
          if (builder._tracker.dirty.size === 0 && !builder._flushScheduled && !builder._updateScheduled) {
            return;
          }
        }
        throw new Error('the builder did not settle');
      };

      const check = () => {
        expect(builder._tracker.dirty.size, 'dirty keys after settling').to.equal(0);
        for (const [id, keys] of builder._expansions) {
          expect(model.findNode(id), `tracked node ${id}`).not.to.be.undefined;
          for (const key of keys) {
            expect(builder._tracker.tracks(key)).to.be.true;
            const relation = key.slice(id.length + 1);
            const expected =
              relation === 'other' && !other
                ? []
                : segments(id, relation, (source) => registry.get(sources[source])).map((segment) =>
                    GraphNode.qualifyId(id, segment),
                  );
            const actual = model
              .outgoing(id, relation)
              .toSorted((a, b) => a.data.order - b.data.order)
              .map((edge) => edge.target);
            expect(actual, `${id} ${relation}`).to.deep.equal(expected);
          }
        }
        for (const key of builder._flushed.keys()) {
          expect(builder._tracker.tracks(key), `flushed key ${key} is tracked`).to.be.true;
        }
        expect(logged, 'warnings and errors').to.deep.equal([]);
      };

      const nodes = () => model.nodes.map(({ id }) => id).toSorted();
      builder.children(GraphNode.RootId);
      for (const step of commands) {
        switch (step.kind) {
          case 'set': {
            const before = reads;
            const write = () => registry.set(sources[step.source], step.value);
            if (step.batch) {
              Atom.batch(write);
            } else {
              write();
              // The point of the builder: a write marks connectors dirty and runs none of them.
              expect(reads, 'connector reads inside a write').to.equal(before);
            }
            break;
          }
          case 'expand': {
            const candidates = nodes().filter((id) => !builder._tracker.tracks(`${id}\u0001${step.relation}`));
            if (candidates.length > 0) {
              builder.children(candidates[step.pick % candidates.length], step.relation);
            }
            break;
          }
          case 'release': {
            // A relation's whole output, as retention releases a level at a time: releasing part of one
            // tears the relation down while the rest of its edges stay.
            const candidates = nodes().filter((id) => model.outgoing(id, step.relation).length > 0);
            if (candidates.length > 0) {
              const id = candidates[step.pick % candidates.length];
              const targets = model.outgoing(id, step.relation).map((edge) => edge.target);
              GraphBuilder.release(builder, [...targets, ...targets.flatMap((target) => model.descendants(target))]);
            }
            break;
          }
          case 'toggle': {
            other = !other;
            if (other) {
              GraphBuilder.addExtension(builder, extension('other'));
            } else {
              GraphBuilder.removeExtension(builder, 'other');
            }
            break;
          }
          case 'settle': {
            await settle();
            check();
            break;
          }
          case 'advance': {
            await settle();
            await vi.advanceTimersByTimeAsync(step.ms);
            await settle();
            check();
            break;
          }
        }
      }
      await settle();
      check();

      // Destroy releases the connectors at once, well inside the anchors' TTL, and the anchors after it.
      GraphBuilder.destroy(builder);
      await vi.advanceTimersByTimeAsync(10_000);
      await turn();
      expect(
        connectors.filter((atom) => registry.getNodes().has(atom)),
        'connectors',
      ).to.have.length(0);
      await vi.advanceTimersByTimeAsync(5 * ANCHOR_TTL);
      expect(
        [...registry.getNodes().values()].filter((node) => node.atom.idleTTL === ANCHOR_TTL),
        'anchors',
      ).to.have.length(0);
    } finally {
      // A failed run must not leave its builder behind to log into the next one.
      GraphBuilder.destroy(builder);
      registry.dispose();
      removeProcessor();
      vi.useRealTimers();
    }
  };

  test('the graph matches its connectors after any sequence of changes', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          ttl: fc.boolean(),
          budget: fc.option(fc.integer({ min: 1, max: 3 }), { nil: undefined }),
          commands: fc.array(command, { maxLength: 80 }),
        }),
        run,
      ),
      // Seeded, so CI replays the same cases; FC_RUNS and FC_SEED widen the search locally.
      { numRuns: Number(process.env.FC_RUNS ?? 300), seed: Number(process.env.FC_SEED ?? 1) },
    );
  });
});
