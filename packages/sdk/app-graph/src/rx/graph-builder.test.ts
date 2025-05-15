//
// Copyright 2023 DXOS.org
//

import { Registry, Rx } from '@effect-rx/rx-react';
import { describe, expect, onTestFinished, test } from 'vitest';

import { ROOT_ID } from './graph';
import { createExtension, GraphBuilder } from './graph-builder';
import { type Node } from '../node';

const exampleId = (id: number) => `dx:test:${id}`;
const EXAMPLE_ID = exampleId(1);
const EXAMPLE_TYPE = 'dxos.org/type/example';

describe('RxGraphBuilder', () => {
  describe('connector', () => {
    test('works', () => {
      const r = Registry.make();
      const builder = new GraphBuilder();
      builder.addExtension(
        r,
        createExtension({
          id: 'outbound-connector',
          connector: () => Rx.make([{ id: 'child', type: EXAMPLE_TYPE, data: 2 }]),
        }),
      );
      builder.addExtension(
        r,
        createExtension({
          id: 'inbound-connector',
          relation: 'inbound',
          connector: () => Rx.make([{ id: 'parent', type: EXAMPLE_TYPE, data: 0 }]),
        }),
      );

      const graph = builder.graph;
      graph.expand(r, ROOT_ID);
      graph.expand(r, ROOT_ID, 'inbound');

      const outbound = r.get(graph.nodes(ROOT_ID));
      const inbound = r.get(graph.nodes(ROOT_ID, 'inbound'));

      expect(outbound).has.length(1);
      expect(outbound[0].id).to.equal('child');
      expect(outbound[0].data).to.equal(2);
      expect(inbound).has.length(1);
      expect(inbound[0].id).to.equal('parent');
      expect(inbound[0].data).to.equal(0);
    });

    test('updates', () => {
      const r = Registry.make();
      const builder = new GraphBuilder();
      const state = Rx.make(0);
      builder.addExtension(
        r,
        createExtension({
          id: 'connector',
          connector: () => Rx.readable((get) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }]),
        }),
      );
      const graph = builder.graph;
      graph.expand(r, ROOT_ID);

      {
        const [node] = r.get(graph.nodes(ROOT_ID));
        expect(node.data).to.equal(0);
      }

      {
        r.set(state, 1);
        const [node] = r.get(graph.nodes(ROOT_ID));
        expect(node.data).to.equal(1);
      }
    });

    test('subscribes to updates', () => {
      const r = Registry.make();
      const builder = new GraphBuilder();
      const state = Rx.make(0);
      builder.addExtension(
        r,
        createExtension({
          id: 'connector',
          connector: () => Rx.readable((get) => [{ id: EXAMPLE_ID, type: EXAMPLE_TYPE, data: get(state) }]),
        }),
      );
      const graph = builder.graph;

      let count = 0;
      const cancel = r.subscribe(graph.nodes(ROOT_ID), (_) => {
        count++;
      });
      onTestFinished(() => cancel());

      expect(count).to.equal(0);
      expect(r.get(graph.nodes(ROOT_ID))).to.have.length(0);
      expect(count).to.equal(1);

      graph.expand(r, ROOT_ID);
      expect(count).to.equal(2);
      r.set(state, 1);
      expect(count).to.equal(3);
    });

    test('updates with new extensions', () => {
      const r = Registry.make();
      const builder = new GraphBuilder();
      builder.addExtension(
        r,
        createExtension({
          id: 'connector',
          connector: () => Rx.make([{ id: EXAMPLE_ID, type: EXAMPLE_TYPE }]),
        }),
      );
      const graph = builder.graph;
      graph.expand(r, ROOT_ID);

      let nodes: Node[] = [];
      let count = 0;
      const cancel = r.subscribe(graph.nodes(ROOT_ID), (_nodes) => {
        count++;
        nodes = _nodes;
      });
      onTestFinished(() => cancel());

      expect(nodes).has.length(0);
      expect(count).to.equal(0);
      r.get(graph.nodes(ROOT_ID));
      expect(nodes).has.length(1);
      expect(count).to.equal(1);

      builder.addExtension(
        r,
        createExtension({
          id: 'connector-2',
          connector: () => Rx.make([{ id: exampleId(2), type: EXAMPLE_TYPE }]),
        }),
      );
      expect(nodes).has.length(2);
      expect(count).to.equal(2);
    });

    test('removes', () => {
      const r = Registry.make();
      const builder = new GraphBuilder();
      const nodes = Rx.make([
        { id: exampleId(1), type: EXAMPLE_TYPE },
        { id: exampleId(2), type: EXAMPLE_TYPE },
      ]);
      builder.addExtension(
        r,
        createExtension({
          id: 'connector',
          connector: () => nodes,
        }),
      );
      const graph = builder.graph;
      graph.expand(r, ROOT_ID);

      {
        const nodes = r.get(graph.nodes(ROOT_ID));
        expect(nodes).has.length(2);
        expect(nodes[0].id).to.equal(exampleId(1));
        expect(nodes[1].id).to.equal(exampleId(2));
      }

      r.set(nodes, [{ id: exampleId(3), type: EXAMPLE_TYPE }]);

      {
        const nodes = r.get(graph.nodes(ROOT_ID));
        expect(nodes).has.length(1);
        expect(nodes[0].id).to.equal(exampleId(3));
      }
    });
  });
});
