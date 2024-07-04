//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { ACTION_TYPE } from './graph';
import { GraphBuilder, connector, hydrator, memoize } from './graph-builder';

describe('GraphBuilder', () => {
  describe('hydrator', () => {
    test('works', () => {
      const builder = new GraphBuilder();
      const graph = builder.build();

      expect(graph.findNode('example', 'type')).to.be.undefined;

      builder.addExtension(
        'hydrator',
        hydrator(({ id, type }) => ({ id, type, data: 1 })),
      );
      const node = graph.findNode('example', 'type');

      expect(node?.id).to.equal('example');
      expect(node?.type).to.equal('type');
      expect(node?.data).to.equal(1);
    });

    test('updates', () => {
      const builder = new GraphBuilder();
      const name = signal('default');
      builder.addExtension(
        'hydrator',
        hydrator(({ id, type }) => ({ id, type, data: name.value })),
      );
      const graph = builder.build();

      expect(graph.findNode('example', 'type')?.data).to.equal('default');

      name.value = 'updated';

      expect(graph.findNode('example', 'type')?.data).to.equal('updated');
    });

    test('memoize', () => {
      const builder = new GraphBuilder();
      const name = signal('default');
      let count = 0;
      let memoizedCount = 0;
      builder.addExtension(
        'hydrator',
        hydrator(({ id, type }) => {
          count++;
          memoize(() => {
            memoizedCount++;
          });

          return { id, type, data: name.value };
        }),
      );
      const graph = builder.build();

      expect(graph.findNode('example', 'type')?.data).to.equal('default');
      expect(count).to.equal(1);
      expect(memoizedCount).to.equal(1);

      name!.value = 'one';
      name!.value = 'two';
      name!.value = 'three';

      expect(count).to.equal(4);
      expect(memoizedCount).to.equal(1);
    });
  });

  describe('connector', () => {
    test('works', () => {
      const builder = new GraphBuilder();
      const graph = builder.build();
      builder.addExtension(
        'connector',
        connector(({ direction }) =>
          direction === 'outbound'
            ? [{ id: 'child', type: 'type', data: 2 }]
            : [{ id: 'parent', type: 'type', data: 0 }],
        ),
      );

      const outbound = graph.nodes(graph.root);
      const inbound = graph.nodes(graph.root, { direction: 'inbound' });

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
        'connector',
        connector(() => [{ id: 'named', type: 'type', data: name, properties: { label: name.value } }]),
      );
      const graph = builder.build();

      expect(graph.nodes(graph.root)[0]?.properties.label).to.equal('default');

      name.value = 'updated';

      expect(graph.nodes(graph.root)[0]?.properties.label).to.equal('updated');
    });

    test('removes', () => {
      const builder = new GraphBuilder();
      const nodes = signal([
        { id: 'first', type: 'type', data: 1 },
        { id: 'second', type: 'type', data: 2 },
      ]);
      builder.addExtension(
        'connector',
        connector(({ node }) => {
          if (node.id === 'root') {
            return nodes.value;
          } else {
            return [];
          }
        }),
      );
      const graph = builder.build();

      expect(graph.nodes(graph.root)).has.length(2);

      nodes.value = [{ id: 'third', type: 'type', data: 3 }];

      expect(graph.nodes(graph.root)).has.length(1);
      expect(graph.nodes(graph.root)[0].id).to.equal('third');
      expect(graph.findNode('first', 'type')).to.be.undefined;
    });

    test('filters by type', () => {
      const builder = new GraphBuilder();
      builder.addExtension(
        'action',
        connector(({ type }) => {
          if (type === ACTION_TYPE) {
            return [{ id: 'action', type: ACTION_TYPE, data: () => {} }];
          } else {
            return [];
          }
        }),
      );
      builder.addExtension(
        'not-action',
        connector(({ type }) => {
          if (!type) {
            return [{ id: 'not-action', type: 'type', data: 2 }];
          } else {
            return [];
          }
        }),
      );
      const graph = builder.build();
      const actions = graph.actions(graph.root);

      expect(actions).has.length(1);
      expect(actions?.[0].id).to.equal('action');
      expect(actions?.[0].type).to.equal(ACTION_TYPE);
      expect(graph.findNode('not-action', 'type')).to.be.undefined;

      const nodes = graph.nodes(graph.root);

      expect(nodes).has.length(1);
      expect(nodes?.[0].id).to.equal('not-action');
      expect(nodes?.[0].data).to.equal(2);
    });

    test('memoize', () => {
      const builder = new GraphBuilder();
      const name = signal('default');
      let count = 0;
      let memoizedCount = 0;
      builder.addExtension(
        'connector',
        connector(() => {
          count++;
          memoize(() => {
            memoizedCount++;
          });

          return [{ id: 'named', type: 'type', data: name, properties: { label: name.value } }];
        }),
      );
      const graph = builder.build();

      expect(graph.nodes(graph.root)[0]?.properties.label).to.equal('default');
      expect(count).to.equal(1);
      expect(memoizedCount).to.equal(1);

      name!.value = 'one';
      name!.value = 'two';
      name!.value = 'three';

      expect(count).to.equal(4);
      expect(memoizedCount).to.equal(1);
    });
  });

  describe('traverse', () => {
    test('works', async () => {
      const builder = new GraphBuilder();
      builder.addExtension(
        'connector',
        connector(({ node }) => {
          const data = node.data ? node.data + 1 : 1;
          return data > 5 ? [] : [{ id: `node-${data}`, type: 'type', data }];
        }),
      );
      const graph = builder.build();

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
        'hydrator',
        hydrator(({ id, type }) => {
          const data = memoize(() => Math.random());
          return { id, type, data, properties: { name: name.value } };
        }),
      );
      builder.addExtension(
        'connector',
        connector(({ node }) => {
          // TODO(wittjosiah): Should subscribe to parent changes.
          const a = memoize(() => Math.random());
          const b = memoize(() => Math.random());
          const c = Math.random();
          return [{ id: 'second', type: 'type', data: { a, b, c, data: node.id } }];
        }),
      );
      const graph = builder.build();

      const initialOne = graph.findNode('first', 'type');
      const initialData = initialOne!.data;
      const initialTwo = graph.nodes(initialOne!)[0];
      const initialA = initialTwo?.data.a;
      const initialB = initialTwo?.data.b;
      const initialC = initialTwo?.data.c;

      name.value = 'updated';
      const one = graph.findNode('first', 'type');
      const two = graph.nodes(one!)[0];

      expect(one?.properties.name).to.equal('updated');
      expect(one?.data).to.equal(initialData);
      expect(two?.data.a).to.equal(initialA);
      expect(two?.data.b).to.equal(initialB);
      expect(two?.data.c).not.to.equal(initialC);
    });
  });
});
