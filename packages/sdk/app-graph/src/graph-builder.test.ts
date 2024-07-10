//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { ACTION_TYPE } from './graph';
import { GraphBuilder, createExtension, memoize } from './graph-builder';
import { type Node } from './node';

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('GraphBuilder', () => {
  describe('resolver', () => {
    test('works', () => {
      const builder = new GraphBuilder();
      const graph = builder.graph;

      {
        const node = graph.findNode(EXAMPLE_ID);
        expect(node).to.be.undefined;
      }

      builder.addExtension(
        createExtension({ id: 'resolver', resolver: () => ({ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: 1 }) }),
      );

      {
        const node = graph.findNode(EXAMPLE_ID);
        expect(node?.id).to.equal(EXAMPLE_ID);
        expect(node?.type).to.equal(EXAMPLE_TYPE);
        expect(node?.data).to.equal(1);
      }
    });

    test('updates', () => {
      const builder = new GraphBuilder();
      const name = signal('default');
      builder.addExtension(
        createExtension({ id: 'resolver', resolver: () => ({ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name.value }) }),
      );
      const graph = builder.graph;

      const node = graph.findNode(EXAMPLE_ID);
      expect(node?.data).to.equal('default');

      name.value = 'updated';
      expect(node?.data).to.equal('updated');
    });

    test('memoize', () => {
      const builder = new GraphBuilder();
      const name = signal('default');
      let count = 0;
      let memoizedCount = 0;
      builder.addExtension(
        createExtension({
          id: 'resolver',
          resolver: () => {
            count++;
            memoize(() => {
              memoizedCount++;
            });

            return { id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name.value };
          },
        }),
      );
      const graph = builder.graph;

      const node = graph.findNode(EXAMPLE_ID);
      expect(node?.data).to.equal('default');
      expect(count).to.equal(1);
      expect(memoizedCount).to.equal(1);

      name!.value = 'one';
      name!.value = 'two';
      name!.value = 'three';

      expect(node?.data).to.equal('three');
      expect(count).to.equal(4);
      expect(memoizedCount).to.equal(1);
    });
  });

  describe('connector', () => {
    test('works', () => {
      const builder = new GraphBuilder();
      const graph = builder.graph;
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

      const outbound = graph.nodes(graph.root);
      const inbound = graph.nodes(graph.root, { relation: 'inbound' });

      expect(outbound).has.length(1);
      expect(outbound?.[0].id).to.equal('child');
      expect(outbound?.[0].data).to.equal(2);
      expect(inbound).has.length(1);
      expect(inbound?.[0].id).to.equal('parent');
      expect(inbound?.[0].data).to.equal(0);
    });

    test('updates', () => {
      const builder = new GraphBuilder();
      const name = signal('default');
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: () => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name, properties: { label: name.value } }],
        }),
      );
      const graph = builder.graph;

      const [node] = graph.nodes(graph.root);
      expect(node.properties.label).to.equal('default');

      name.value = 'updated';
      expect(node.properties.label).to.equal('updated');
    });

    test('removes', () => {
      const builder = new GraphBuilder();
      const nodes = signal([
        { id: exampleId(1), type: EXAMPLE_TYPE, data: 1 },
        { id: exampleId(2), type: EXAMPLE_TYPE, data: 2 },
      ]);
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: ({ node }) => {
            if (node.id === 'root') {
              return nodes.value;
            } else {
              return [];
            }
          },
        }),
      );
      const graph = builder.graph;

      {
        const nodes = graph.nodes(graph.root);
        expect(nodes).has.length(2);
        expect(nodes[0].id).to.equal(exampleId(1));
      }

      nodes.value = [{ id: 'third', type: 'type', data: 3 }];

      {
        const nodes = graph.nodes(graph.root);
        expect(nodes).has.length(1);
        expect(nodes[0].id).to.equal('third');
        expect(graph.findNode('first', 'type')).to.be.undefined;
      }
    });

    test('filters by type', () => {
      const builder = new GraphBuilder();
      builder.addExtension(
        createExtension({
          id: 'actions',
          connector: () => [{ id: 'not-action', type: EXAMPLE_TYPE, data: 1 }],
          actions: () => [{ id: 'action', data: () => {} }],
        }),
      );
      const graph = builder.graph;

      const actions = graph.actions(graph.root);
      expect(actions).has.length(1);
      expect(actions?.[0].id).to.equal('action');
      expect(actions?.[0].type).to.equal(ACTION_TYPE);

      const node = graph.findNode('not-action', EXAMPLE_TYPE);
      expect(node).to.be.undefined;

      const nodes = graph.nodes(graph.root);
      expect(nodes).has.length(1);
      expect(nodes?.[0].id).to.equal('not-action');
      expect(nodes?.[0].data).to.equal(1);
    });

    test('filters by callback', () => {
      const builder = new GraphBuilder();
      builder.addExtension(
        createExtension({
          id: 'filtered-connector',
          filter: (node): node is Node<null> => node.id === 'root',
          connector: () => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: 1 }],
        }),
      );
      const graph = builder.graph;

      const [node1] = graph.nodes(graph.root);
      expect(node1?.id).to.equal(EXAMPLE_ID);

      const nodes = graph.nodes(node1);
      expect(nodes).has.length(0);
    });

    test('memoize', () => {
      const builder = new GraphBuilder();
      const name = signal('default');
      let count = 0;
      let memoizedCount = 0;
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: () => {
            count++;
            memoize(() => {
              memoizedCount++;
            });

            return [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: name, properties: { label: name.value } }];
          },
        }),
      );
      const graph = builder.graph;

      const [node] = graph.nodes(graph.root);
      expect(node.properties.label).to.equal('default');
      expect(count).to.equal(1);
      expect(memoizedCount).to.equal(1);

      name!.value = 'one';
      name!.value = 'two';
      name!.value = 'three';

      expect(node.properties.label).to.equal('three');
      expect(count).to.equal(4);
      expect(memoizedCount).to.equal(1);
    });
  });

  describe('traverse', () => {
    test('works', async () => {
      const builder = new GraphBuilder();
      builder.addExtension(
        createExtension({
          id: 'connector',
          connector: ({ node }) => {
            const data = node.data ? node.data + 1 : 1;
            return data > 5 ? [] : [{ id: `node-${data}`, type: EXAMPLE_TYPE, data }];
          },
        }),
      );
      const graph = builder.graph;

      let count = 0;
      await builder.traverse({
        node: graph.root,
        visitor: () => {
          count++;
        },
      });

      expect(count).to.equal(6);
    });
  });

  describe('multiples', () => {
    test('one of each with multiple memos', () => {
      const builder = new GraphBuilder();
      const name = signal('default');
      builder.addExtension(
        createExtension({
          id: 'extension',
          resolver: () => {
            const data = memoize(() => Math.random());
            return { id: EXAMPLE_ID, type: EXAMPLE_TYPE, data, properties: { name: name.value } };
          },
          connector: ({ node }) => {
            // TODO(wittjosiah): Should subscribe to parent changes.
            const a = memoize(() => Math.random());
            const b = memoize(() => Math.random());
            const c = Math.random();
            return [{ id: `${EXAMPLE_ID}-child`, type: EXAMPLE_TYPE, data: { a, b, c, data: node.id } }];
          },
        }),
      );
      const graph = builder.graph;

      const one = graph.findNode(EXAMPLE_ID);
      const initialData = one!.data;
      const two = graph.nodes(one!)[0];
      const initialA = two?.data.a;
      const initialB = two?.data.b;
      const initialC = two?.data.c;

      name.value = 'updated';

      expect(one?.properties.name).to.equal('updated');
      expect(one?.data).to.equal(initialData);
      expect(two?.data.a).to.equal(initialA);
      expect(two?.data.b).to.equal(initialB);
      expect(two?.data.c).not.to.equal(initialC);
    });
  });
});
