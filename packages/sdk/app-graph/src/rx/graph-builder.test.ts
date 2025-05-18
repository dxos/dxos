//
// Copyright 2023 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { Array, Option, pipe, Record } from 'effect';
import { afterEach, beforeEach, describe, expect, onTestFinished, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { EchoTestBuilder } from '@dxos/echo-db/testing';
import { Ref } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { byPosition, getDebugName, isNonNullable } from '@dxos/util';

import { ROOT_ID, ROOT_TYPE } from './graph';
import { createExtension, GraphBuilder, rxFromRef } from './graph-builder';
import { type NodeArg, type Node } from '../node';

registerSignalsRuntime();

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('RxGraphBuilder', () => {
  describe('connector', () => {
    test('works', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      builder.addExtension(
        createExtension({
          id: 'outbound-connector',
          connector: () => [{ id: 'child', type: EXAMPLE_TYPE, data: 2 }],
        }),
      );
      builder.addExtension(
        createExtension({
          id: 'inbound-connector',
          relation: 'inbound',
          connector: () => [{ id: 'parent', type: EXAMPLE_TYPE, data: 0 }],
        }),
      );

      const graph = builder.graph;
      graph.expand(ROOT_ID);
      graph.expand(ROOT_ID, 'inbound');

      const outbound = registry.get(graph.connections(ROOT_ID));
      const inbound = registry.get(graph.connections(ROOT_ID, 'inbound'));

      expect(outbound).has.length(1);
      expect(outbound[0].id).to.equal('child');
      expect(outbound[0].data).to.equal(2);
      expect(inbound).has.length(1);
      expect(inbound[0].id).to.equal('parent');
      expect(inbound[0].data).to.equal(0);
    });

    test('updates', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const state = Rx.make(0);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: ({ get }) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }],
        }),
      );
      const graph = builder.graph;
      graph.expand(ROOT_ID);

      {
        const [node] = registry.get(graph.connections(ROOT_ID));
        expect(node.data).to.equal(0);
      }

      {
        registry.set(state, 1);
        const [node] = registry.get(graph.connections(ROOT_ID));
        expect(node.data).to.equal(1);
      }
    });

    test('subscribes to updates', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const state = Rx.make(0);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: ({ get }) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }],
        }),
      );
      const graph = builder.graph;

      let count = 0;
      const cancel = registry.subscribe(graph.connections(ROOT_ID), (_) => {
        count++;
      });
      onTestFinished(() => cancel());

      expect(count).to.equal(0);
      expect(registry.get(graph.connections(ROOT_ID))).to.have.length(0);
      expect(count).to.equal(1);

      graph.expand(ROOT_ID);
      expect(count).to.equal(2);
      registry.set(state, 1);
      expect(count).to.equal(3);
    });

    test('updates with new extensions', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: () => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE }],
        }),
      );
      const graph = builder.graph;
      graph.expand(ROOT_ID);

      let nodes: Node[] = [];
      let count = 0;
      const cancel = registry.subscribe(graph.connections(ROOT_ID), (_nodes) => {
        count++;
        nodes = _nodes;
      });
      onTestFinished(() => cancel());

      expect(nodes).has.length(0);
      expect(count).to.equal(0);
      registry.get(graph.connections(ROOT_ID));
      expect(nodes).has.length(1);
      expect(count).to.equal(1);

      builder.addExtension(
        createExtension({
          id: 'connector-2',
          connector: () => [{ id: exampleId(2), type: EXAMPLE_TYPE }],
        }),
      );
      expect(nodes).has.length(2);
      expect(count).to.equal(2);
    });

    test('removes', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const nodes = Rx.make([
        { id: exampleId(1), type: EXAMPLE_TYPE },
        { id: exampleId(2), type: EXAMPLE_TYPE },
      ]);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: ({ get }) => get(nodes),
        }),
      );
      const graph = builder.graph;
      graph.expand(ROOT_ID);

      {
        const nodes = registry.get(graph.connections(ROOT_ID));
        expect(nodes).has.length(2);
        expect(nodes[0].id).to.equal(exampleId(1));
        expect(nodes[1].id).to.equal(exampleId(2));
      }

      registry.set(nodes, [{ id: exampleId(3), type: EXAMPLE_TYPE }]);

      {
        const nodes = registry.get(graph.connections(ROOT_ID));
        expect(nodes).has.length(1);
        expect(nodes[0].id).to.equal(exampleId(3));
      }
    });

    test('nodes are updated when removed', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const name = Rx.make('removed');

      builder.addExtension([
        createExtension({
          id: 'root',
          connector: ({ get, node }) =>
            pipe(
              node.id === 'root' ? Option.some(get(name)) : Option.none(),
              Option.filter((name) => name !== 'removed'),
              Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
              Option.getOrElse(() => []),
            ),
        }),
      ]);

      const graph = builder.graph;

      let count = 0;
      let exists = false;
      const cancel = registry.subscribe(graph.node(EXAMPLE_ID), (node) => {
        count++;
        exists = Option.isSome(node);
      });
      onTestFinished(() => cancel());

      graph.expand(ROOT_ID);
      expect(count).to.equal(0);
      expect(exists).to.be.false;

      registry.set(name, 'default');
      expect(count).to.equal(1);
      expect(exists).to.be.true;

      registry.set(name, 'removed');
      expect(count).to.equal(2);
      expect(exists).to.be.false;

      registry.set(name, 'added');
      expect(count).to.equal(3);
      expect(exists).to.be.true;
    });

    test('updates are constrained', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const name = Rx.make('default');
      const sub = Rx.make('default');

      builder.addExtension([
        createExtension({
          id: 'root',
          connector: ({ get, node }) =>
            pipe(
              node.id === 'root' ? Option.some(get(name)) : Option.none(),
              Option.filter((name) => name !== 'removed'),
              Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
              Option.getOrElse(() => []),
            ),
        }),
        createExtension({
          id: 'connector1',
          connector: ({ get, node }) =>
            pipe(
              node.id === EXAMPLE_ID ? Option.some(get(sub)) : Option.none(),
              Option.map((sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }]),
              Option.getOrElse(() => []),
            ),
        }),
        createExtension({
          id: 'connector2',
          connector: ({ get, node }) =>
            pipe(
              node.id === EXAMPLE_ID ? Option.some(node.data) : Option.none(),
              Option.map((data) => [{ id: exampleId(3), type: EXAMPLE_TYPE, data }]),
              Option.getOrElse(() => []),
            ),
        }),
      ]);

      const graph = builder.graph;

      let parentCount = 0;
      const parentCancel = registry.subscribe(graph.node(EXAMPLE_ID), (_) => {
        parentCount++;
      });
      onTestFinished(() => parentCancel());

      let independentCount = 0;
      const independentCancel = registry.subscribe(graph.node(exampleId(2)), (_) => {
        independentCount++;
      });
      onTestFinished(() => independentCancel());

      let dependentCount = 0;
      const dependentCancel = registry.subscribe(graph.node(exampleId(3)), (_) => {
        dependentCount++;
      });
      onTestFinished(() => dependentCancel());

      graph.expand(ROOT_ID);
      graph.expand(EXAMPLE_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(1);

      registry.set(sub, 'one');
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(1);

      registry.set(sub, 'two');
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(1);

      registry.set(sub, 'three');
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(4);
      expect(dependentCount).to.equal(1);

      registry.set(name, 'name');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(4);
      expect(dependentCount).to.equal(2);

      registry.set(sub, 'four');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(5);
      expect(dependentCount).to.equal(2);
    });

    test.skip('updates are constrained failing 1', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const name = Rx.make('default');
      const sub = Rx.make('default');

      builder.addExtension([
        createExtension({
          id: 'root',
          connector: ({ get, node }) =>
            pipe(
              node.id === 'root' ? Option.some(get(name)) : Option.none(),
              Option.filter((name) => name !== 'removed'),
              Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
              Option.getOrElse(() => []),
            ),
        }),
        createExtension({
          id: 'connector1',
          connector: ({ get, node }) =>
            pipe(
              node.id === EXAMPLE_ID ? Option.some(get(sub)) : Option.none(),
              Option.map((sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }]),
              Option.getOrElse(() => []),
            ),
        }),
        createExtension({
          id: 'connector2',
          connector: ({ get, node }) =>
            pipe(
              node.id === EXAMPLE_ID ? Option.some(node.data) : Option.none(),
              Option.map((data) => [{ id: exampleId(3), type: EXAMPLE_TYPE, data }]),
              Option.getOrElse(() => []),
            ),
        }),
      ]);

      const graph = builder.graph;

      let parentCount = 0;
      const parentCancel = registry.subscribe(graph.node(EXAMPLE_ID), (_) => {
        // console.log('parent', _);
        parentCount++;
      });
      onTestFinished(() => parentCancel());

      let independentCount = 0;
      const independentCancel = registry.subscribe(graph.node(exampleId(2)), (_) => {
        // console.log('independent', _);
        independentCount++;
      });
      onTestFinished(() => independentCancel());

      let dependentCount = 0;
      const dependentCancel = registry.subscribe(graph.node(exampleId(3)), (_) => {
        // console.log('dependent', _);
        dependentCount++;
      });
      onTestFinished(() => dependentCancel());

      console.log('start');

      // Counts should not increment until the node is expanded.
      graph.expand(ROOT_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(0);
      expect(dependentCount).to.equal(0);

      console.log('expanded');

      // Counts should increment when the node is expanded.
      graph.expand(EXAMPLE_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(1);

      console.log('update name');

      // Only dependent count should increment when the parent changes.
      registry.set(name, 'updated');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(2);

      console.log('update sub');

      // Only independent count should increment when state changes.
      registry.set(sub, '???');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(2);

      // console.log('batch');

      // // Counts should not increment because the node is removed.
      // Rx.batch(() => {
      //   registry.set(name, 'removed');
      //   registry.set(sub, 'batch');
      // });
      // expect(parentCount).to.equal(2);
      // expect(independentCount).to.equal(2);
      // expect(dependentCount).to.equal(2);

      console.log('update sub!');

      // Independent count should increment.
      registry.set(sub, '!!!');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(2);

      // console.log('added');

      // // Dependent count should increment when the node is added back.
      // registry.set(name, 'added');
      // expect(independentCount).to.equal(2);
      // expect(dependentCount).to.equal(3);

      // // Counts should not increment when the node is expanded again.
      // graph.expand(EXAMPLE_ID);
      // expect(independentCount).to.equal(2);
      // expect(dependentCount).to.equal(3);
    });

    test.skip('updates are constrained failing 2', () => {
      const registry = Registry.make();
      const builder = new GraphBuilder({ registry });
      const name = Rx.make('default').pipe(Rx.keepAlive, Rx.withLabel('name'));
      const sub = Rx.make('default').pipe(Rx.keepAlive, Rx.withLabel('sub'));

      builder.addExtension([
        createExtension({
          id: 'root',
          connector: ({ get, node }) => {
            const result = pipe(
              node.id === 'root' ? Option.some(get(name)) : Option.none(),
              Option.filter((name) => name !== 'removed'),
              Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
              Option.getOrElse(() => []),
            );
            console.log('!!root', getDebugName(node), getDebugName(result), node.id);
            return result;
          },
        }),
        createExtension({
          id: 'connector1',
          connector: ({ get, node }) => {
            const result = pipe(
              node.id === EXAMPLE_ID ? Option.some(get(sub)) : Option.none(),
              Option.map((sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }]),
              Option.getOrElse(() => []),
            );
            console.log('!!connector1', getDebugName(node), getDebugName(result), node.id);
            return result;
          },
        }),
        createExtension({
          id: 'connector2',
          connector: ({ get, node }) => {
            const result = pipe(
              node.id === EXAMPLE_ID ? Option.some(node.data) : Option.none(),
              Option.map((data) => {
                console.log('??connector2', data);
                return [{ id: exampleId(3), type: EXAMPLE_TYPE, data }];
              }),
              Option.getOrElse(() => []),
            );
            console.log('!!connector2', getDebugName(node), getDebugName(result), node.id);
            return result;
          },
        }),
      ]);

      const graph = builder.graph;

      let parentCount = 0;
      const parentCancel = registry.subscribe(graph.node(EXAMPLE_ID), (_) => {
        // console.log('parent', _);
        parentCount++;
      });
      onTestFinished(() => parentCancel());

      let independentCount = 0;
      const independentCancel = registry.subscribe(graph.node(exampleId(2)), (_) => {
        // console.log('independent', _);
        independentCount++;
      });
      onTestFinished(() => independentCancel());

      let dependentCount = 0;
      const dependentCancel = registry.subscribe(graph.node(exampleId(3)), (_) => {
        // console.log('dependent', _);
        dependentCount++;
      });
      onTestFinished(() => dependentCancel());

      console.log('\nstart\n');

      graph.expand(ROOT_ID);
      graph.expand(EXAMPLE_ID);
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(1);
      expect(dependentCount).to.equal(1);

      console.log('\nsub one\n');

      registry.set(sub, 'one');
      expect(parentCount).to.equal(1);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(1);

      console.log('\nname a\n');

      registry.set(name, 'a');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(2);
      expect(dependentCount).to.equal(2);

      console.log('\nsub two\n');

      registry.set(sub, 'two');
      expect(parentCount).to.equal(2);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(2);

      console.log('\nname b\n');

      // TODO(wittjosiah): Issues seems to be that the `connectors` rx value is not being re-evaluated when the name changes at this point for some reason.
      registry.set(name, 'b');
      expect(parentCount).to.equal(3);
      expect(independentCount).to.equal(3);
      expect(dependentCount).to.equal(3); // current: 2

      // class N {
      //   parents: N[];
      //   rx: any;
      //   lifetime: any;
      // }

      // const nodes = (registry as any).nodes as Map<Rx.Rx<any>, N>;
      // const getLabel = (n: N) => n.rx.label[0];
      // const parents = Array.from(nodes.values()).map(
      //   (n) => [getLabel(n), n.parents.map(getLabel)] as [string, string[]],
      // );
      // console.log(parents);

      console.log('\nsub three\n');

      registry.set(sub, 'three');
      expect(parentCount).to.equal(3);
      expect(independentCount).to.equal(4); // current: 3
      expect(dependentCount).to.equal(3); // current: 2
    });
  });

  describe('rx', () => {
    test.skip('repro attempt', () => {
      const registry = Registry.make();
      const valueA = Rx.make(0).pipe(Rx.keepAlive, Rx.withLabel('valueA'));
      const valueB = Rx.make(0).pipe(Rx.keepAlive, Rx.withLabel('valueB'));
      registry.get(valueA);
      registry.get(valueB);

      const nodeA = Rx.make({ id: 'a', type: 'a', data: 0 }).pipe(Rx.keepAlive, Rx.withLabel('nodeA'));
      const nodeB = Rx.make({ id: 'b', type: 'b', data: 0 }).pipe(Rx.keepAlive, Rx.withLabel('nodeB'));
      const nodeC = Rx.make({ id: 'c', type: 'c', data: null }).pipe(Rx.keepAlive, Rx.withLabel('nodeC'));
      const nodeD = Rx.make({ id: 'd', type: 'd', data: null }).pipe(Rx.keepAlive, Rx.withLabel('nodeD'));
      registry.get(nodeA);
      registry.get(nodeB);
      registry.get(nodeC);
      registry.get(nodeD);

      const familyA = Rx.family((node: Rx.Rx<any>) =>
        Rx.readable((get) => (get(node).id === 'a' ? `only${get(valueA)}` : '')).pipe(
          Rx.keepAlive,
          Rx.withLabel(`familyA:${node.label?.[0]}`),
        ),
      );
      const familyB = Rx.family((node: Rx.Rx<any>) =>
        Rx.readable((get) => {
          const n = get(node);
          return n.id !== 'a' ? `${n}${get(valueB)}` : '';
        }).pipe(Rx.keepAlive, Rx.withLabel(`familyB:${node.label?.[0]}`)),
      );
      const familyC = Rx.family((node: Rx.Rx<any>) =>
        Rx.readable((get) => `${get(node).data}}`).pipe(Rx.keepAlive, Rx.withLabel(`familyC:${node.label?.[0]}`)),
      );

      const root = Rx.family((node: Rx.Rx<any>) =>
        Rx.readable((get) => [get(familyA(node)), get(familyB(node)), get(familyC(node))]).pipe(
          Rx.keepAlive,
          Rx.withLabel(`root:${node.label?.[0]}`),
        ),
      );
      registry.get(root(nodeA));
      registry.get(root(nodeB));

      // class N {
      //   parents: N[];
      //   rx: any;
      // }

      // const nodes = (registry as any).nodes as Map<Rx.Rx<any>, N>;
      // const getLabel = (n: N) => n.rx.label[0];
      // const parents = Array.from(nodes.values()).map(
      //   (n) => [getLabel(n), n.parents.map(getLabel)] as [string, string[]],
      // );
      // console.log(parents);

      let countA = 0;
      const cancelA = registry.subscribe(root(nodeA), (nodes) => {
        countA++;
        const b = registry.get(nodeB);
        registry.set(nodeB, { ...b, data: b.data + 1 });
      });
      onTestFinished(() => cancelA());

      let countB = 0;
      const cancelB = registry.subscribe(root(nodeB), (nodes) => {
        countB++;
      });
      onTestFinished(() => cancelB());

      registry.set(valueA, 1);
      expect(countA).to.equal(1);
      expect(countB).to.equal(1);

      registry.set(valueB, 1);
      expect(countA).to.equal(1);
      expect(countB).to.equal(2);

      registry.set(valueA, 2);
      expect(countA).to.equal(2);
      expect(countB).to.equal(3);

      registry.set(valueB, 2);
      expect(countA).to.equal(2);
      expect(countB).to.equal(4);

      registry.set(valueA, 3);
      expect(countA).to.equal(3);
      expect(countB).to.equal(5);

      registry.set(valueB, 3);
      expect(countA).to.equal(3);
      expect(countB).to.equal(6);
    });

    test.skip('repro attempt 2', () => {
      const registry = Registry.make();
      const nodeFamily = Rx.family<string, Rx.Writable<Option.Option<Node>>>((id) => {
        return Rx.make<Option.Option<Node>>(
          id === ROOT_ID ? Option.some({ id: ROOT_ID, type: ROOT_TYPE, data: null, properties: {} }) : Option.none(),
        ).pipe(Rx.keepAlive, Rx.withLabel(`graph:node:${id}`));
      });

      const name = Rx.make('default').pipe(Rx.keepAlive, Rx.withLabel('name'));
      const sub = Rx.make('default').pipe(Rx.keepAlive, Rx.withLabel('sub'));

      const extensions = Rx.make(
        Record.fromEntries([
          [
            'root/connector',
            createExtension({
              id: 'root',
              connector: ({ get, node }) => {
                const result = pipe(
                  node.id === 'root' ? Option.some(get(name)) : Option.none(),
                  Option.filter((name) => name !== 'removed'),
                  Option.map((name) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name }]),
                  Option.getOrElse(() => []),
                );
                console.log('!!root', getDebugName(node), getDebugName(result), node.id);
                return result;
              },
            })[0],
          ],
          [
            'connector1/connector',
            createExtension({
              id: 'connector1',
              connector: ({ get, node }) => {
                const result = pipe(
                  node.id === EXAMPLE_ID ? Option.some(get(sub)) : Option.none(),
                  Option.map((sub) => [{ id: exampleId(2), type: EXAMPLE_TYPE, data: sub }]),
                  Option.getOrElse(() => []),
                );
                console.log('!!connector1', getDebugName(node), getDebugName(result), node.id);
                return result;
              },
            })[0],
          ],
          [
            'connector2/connector',
            createExtension({
              id: 'connector2',
              connector: ({ get, node }) => {
                const result = pipe(
                  node.id === EXAMPLE_ID ? Option.some(node.data) : Option.none(),
                  Option.map((data) => {
                    console.log('??connector2', data);
                    return [{ id: exampleId(3), type: EXAMPLE_TYPE, data }];
                  }),
                  Option.getOrElse(() => []),
                );
                console.log('!!connector2', getDebugName(node), getDebugName(result), node.id);
                return result;
              },
            })[0],
          ],
        ]),
      ).pipe(Rx.keepAlive, Rx.withLabel('graph-builder:extensions'));

      const connectors = Rx.family<string, Rx.Rx<NodeArg<any>[]>>((key) => {
        return Rx.readable((get) => {
          const [id, relation] = key.split('+');
          const node = nodeFamily(id);

          return pipe(
            get(extensions),
            Record.values,
            Array.sortBy(byPosition),
            Array.filter(({ relation: _relation = 'outbound' }) => _relation === relation),
            Array.map(({ connector }) => connector?.(node)),
            Array.filter(isNonNullable),
            Array.flatMap((result) => get(result)),
          );
        }).pipe(Rx.keepAlive, Rx.withLabel(`graph-builder:connectors:${key}`));
      });

      const updateNode = (node: NodeArg<any>) => {
        const current = registry.get(nodeFamily(node.id)).pipe(Option.getOrNull);
        const typeChanged = current?.type !== node.type;
        const dataChanged = current?.data !== node.data;
        if (typeChanged || dataChanged) {
          registry.set(
            nodeFamily(node.id),
            Option.some({ id: node.id, type: node.type, data: node.data, properties: node.properties ?? {} }),
          );
        }
      };

      const rootConnectorsCancel = registry.subscribe(connectors(`${ROOT_ID}+outbound`), (nodes) => {
        nodes.forEach(updateNode);
      });
      onTestFinished(() => rootConnectorsCancel());

      const nodeConnectorsCancel = registry.subscribe(connectors(`${EXAMPLE_ID}+outbound`), (nodes) => {
        nodes.forEach(updateNode);
      });
      onTestFinished(() => nodeConnectorsCancel());

      let node1Count = 0;
      const node1Cancel = registry.subscribe(nodeFamily(EXAMPLE_ID), (_) => {
        node1Count++;
      });
      onTestFinished(() => node1Cancel());

      let node2Count = 0;
      const node2Cancel = registry.subscribe(nodeFamily(exampleId(2)), (_) => {
        node2Count++;
      });
      onTestFinished(() => node2Cancel());

      let node3Count = 0;
      const node3Cancel = registry.subscribe(nodeFamily(exampleId(3)), (_) => {
        node3Count++;
      });
      onTestFinished(() => node3Cancel());

      registry.get(connectors(`${ROOT_ID}+outbound`));
      registry.get(connectors(`${EXAMPLE_ID}+outbound`));
      // Initialization as Option.none, then set as Option.some.
      expect(node1Count).to.equal(2);
      expect(node2Count).to.equal(2);
      expect(node3Count).to.equal(2);

      // class N {
      //   parents: N[];
      //   rx: any;
      //   lifetime: any;
      // }

      // const nodes = (registry as any).nodes as Map<Rx.Rx<any>, N>;
      // const getLabel = (n: N) => n.rx.label[0];
      // const parents = [...nodes.values()].map((n) => [getLabel(n), n.parents.map(getLabel)] as [string, string[]]);
      // console.log(parents);

      console.log('\nname a\n');

      registry.set(name, 'a');
      expect(node1Count).to.equal(3);
      expect(node2Count).to.equal(2);
      expect(node3Count).to.equal(3);

      console.log('\nsub one\n');

      registry.set(sub, 'one');
      expect(node1Count).to.equal(3);
      expect(node2Count).to.equal(3);
      expect(node3Count).to.equal(3);

      console.log('\nname b\n');

      registry.set(name, 'b');
      expect(node1Count).to.equal(4);
      expect(node2Count).to.equal(3);
      expect(node3Count).to.equal(4);

      console.log('\nsub two\n');

      registry.set(sub, 'two');
      expect(node1Count).to.equal(4);
      expect(node2Count).to.equal(4);
      expect(node3Count).to.equal(4);

      console.log('\nname c\n');

      registry.set(name, 'c');
      expect(node1Count).to.equal(5);
      expect(node2Count).to.equal(4);
      expect(node3Count).to.equal(5);

      console.log('\nsub three\n');

      registry.set(sub, 'three');
      expect(node1Count).to.equal(5);
      expect(node2Count).to.equal(5);
      expect(node3Count).to.equal(5);
    });
  });

  describe('echo', () => {
    let dbBuilder: EchoTestBuilder;

    beforeEach(async () => {
      dbBuilder = await new EchoTestBuilder().open();
    });

    afterEach(async () => {
      await dbBuilder.close();
    });

    test('rx references are loaded lazily and receive signal notifications', async () => {
      const registry = Registry.make();
      await using peer = await dbBuilder.createPeer();

      let outerId: string;
      {
        await using db = await peer.createDatabase();
        const inner = db.add({ name: 'inner' });
        const outer = db.add({ inner: Ref.make(inner) });
        outerId = outer.id;
        await db.flush();
      }

      await peer.reload();
      {
        await using db = await peer.openLastDatabase();
        const outer = (await db.query({ id: outerId }).first()) as any;
        const innerRx = rxFromRef(outer.inner);

        const loaded = new Trigger();
        let count = 0;
        const cancel = registry.subscribe(innerRx, (inner) => {
          count++;
          if (inner) {
            loaded.wake();
          }
        });
        onTestFinished(() => cancel());

        expect(registry.get(innerRx)).to.eq(undefined);
        expect(count).to.eq(1);

        await loaded.wait();
        expect(registry.get(innerRx)).to.include({ name: 'inner' });
        expect(count).to.eq(2);
      }
    });

    test('references graph builder', async () => {
      const registry = Registry.make();
      await using peer = await dbBuilder.createPeer();

      let outerId, innerId: string;
      {
        await using db = await peer.createDatabase();
        const inner = db.add({ name: 'inner' });
        const outer = db.add({ inner: Ref.make(inner) });
        innerId = inner.id;
        outerId = outer.id;
        await db.flush();
      }

      await peer.reload();

      {
        await using db = await peer.openLastDatabase();
        const outer = (await db.query({ id: outerId }).first()) as any;
        const innerRx = rxFromRef(outer.inner);
        const inner = registry.get(innerRx);
        expect(inner).to.eq(undefined);

        const builder = new GraphBuilder({ registry });
        builder.addExtension(
          createExtension({
            id: 'outbound-connector',
            connector: ({ get }) => {
              const inner = get(innerRx) as any;
              return inner ? [{ id: inner.id, type: EXAMPLE_TYPE, data: inner.name }] : [];
            },
          }),
        );

        const graph = builder.graph;

        const loaded = new Trigger();
        let count = 0;
        const cancel = registry.subscribe(graph.connections(ROOT_ID), (nodes) => {
          count++;
          if (nodes.length > 0) {
            loaded.wake();
          }
        });
        onTestFinished(() => cancel());
        registry.get(graph.connections(ROOT_ID));
        expect(count).to.eq(1);

        graph.expand(ROOT_ID);
        await loaded.wait();
        expect(count).to.eq(2);

        const nodes = registry.get(graph.connections(ROOT_ID));
        expect(nodes).has.length(1);
        expect(nodes[0].id).to.eq(innerId);
        expect(nodes[0].data).to.eq('inner');
      }
    });
  });
});
