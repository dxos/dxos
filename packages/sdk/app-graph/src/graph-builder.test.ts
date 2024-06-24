//
// Copyright 2024 DXOS.org
//

import { signal } from '@preact/signals-core';
import { expect } from 'chai';

import { describe, test } from '@dxos/test';

import { ACTION_TYPE } from './graph';
import { GraphBuilder } from './graph-builder';

describe('GraphBuilder', () => {
  describe('hydrator', () => {
    test('works', () => {
      const builder = new GraphBuilder();
      const graph = builder.build();

      expect(graph.findNode('example', 'type')).to.be.undefined;

      builder.addExtension('hydrator', {
        type: 'hydrator',
        extension: (id: string, type: string) => ({ id, type, data: 1 }),
      });
      const node = graph.findNode('example', 'type');

      expect(node?.id).to.equal('example');
      expect(node?.type).to.equal('type');
      expect(node?.data).to.equal(1);
    });
  });

  describe('connector', () => {
    test('works', () => {
      const builder = new GraphBuilder();
      const graph = builder.build();

      expect(graph.root.nodes()).has.length(0);

      builder.addExtension('connector', {
        type: 'connector',
        extension: (node, direction) =>
          direction === 'outbound'
            ? [{ id: 'child', type: 'type', data: 2 }]
            : [{ id: 'parent', type: 'type', data: 0 }],
      });

      const outbound = graph.root.nodes();
      const inbound = graph.root.nodes({ direction: 'inbound' });

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
      builder.addExtension('connector', {
        type: 'connector',
        extension: () => [{ id: 'named', type: 'type', data: name, properties: { label: name.value } }],
      });
      const graph = builder.build();

      expect(graph.root.nodes()[0]?.properties.label).to.equal('default');

      name.value = 'updated';

      expect(graph.root.nodes()[0]?.properties.label).to.equal('updated');
    });

    test('filters by type', () => {
      const builder = new GraphBuilder();
      builder.addExtension('action', {
        type: 'connector',
        extension: (node, direction, type) => {
          if (type === ACTION_TYPE) {
            return [{ id: 'action', type: ACTION_TYPE, data: () => {} }];
          } else {
            return [];
          }
        },
      });
      builder.addExtension('not-action', {
        type: 'connector',
        extension: (node, direction, type) => {
          if (!type) {
            return [{ id: 'not-action', type: 'type', data: 2 }];
          } else {
            return [];
          }
        },
      });
      const graph = builder.build();
      const actions = graph.root.actions();

      expect(actions).has.length(1);
      expect(actions?.[0].id).to.equal('action');
      expect(actions?.[0].type).to.equal(ACTION_TYPE);
      expect(graph.findNode('not-action', 'type')).to.be.undefined;

      const nodes = graph.root.nodes();

      expect(nodes).has.length(1);
      expect(nodes?.[0].id).to.equal('not-action');
      expect(nodes?.[0].data).to.equal(2);
    });
  });
});
