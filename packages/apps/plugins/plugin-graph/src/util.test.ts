//
// Copyright 2023 DXOS.org
//

import { expect } from 'chai';

import { Event, Trigger, UnsubscribeCallback } from '@dxos/async';
import { Plugin } from '@dxos/react-surface';
import { describe, test } from '@dxos/test';
import { jsonify } from '@dxos/util';

import { GraphNode, GraphProvides } from './types';
import { ROOT, buildGraph } from './util';

const checkDepth = (node: GraphNode, depth = 0): number => {
  if (!node.parent) {
    return depth;
  }

  return checkDepth(node.parent, depth + 1);
};

const testPlugin = (id: number, depth = 1): [Plugin<GraphProvides>, Map<string, GraphNode[]>, Map<string, Event>] => {
  const update = new Map<string, Event>();
  const subscriptions = new Map<string, UnsubscribeCallback>();
  const nodesCache = new Map<string, GraphNode[]>();
  const plugin: Plugin<GraphProvides> = {
    meta: {
      id: `test-plugin-${id}`,
    },
    provides: {
      graph: {
        nodes: (parent, emit) => {
          if (checkDepth(parent) >= depth) {
            return [];
          }

          const unsub = subscriptions.get(parent.id);
          if (!unsub) {
            let event = update.get(parent.id);
            if (!event) {
              event = new Event();
              update.set(parent.id, event);
            }
            subscriptions.set(
              parent.id,
              event.on(() => emit()),
            );
          }

          let nodes = nodesCache.get(parent.id);
          if (!nodes) {
            nodes = [
              {
                id: `${parent.id}-node${id}`,
                index: 'a1',
                label: `${parent.id}-node${id}`,
                parent,
              },
            ];

            nodesCache.set(parent.id, nodes);
          }

          return nodes;
        },
        actions: (parent) => {
          if (checkDepth(parent) >= depth) {
            return [];
          }

          return [
            {
              id: `${parent.id}-action${id}`,
              index: 'a1',
              label: `${parent.id}-action${id}`,
              invoke: () => {},
            },
          ];
        },
      },
    },
  };

  return [plugin, nodesCache, update];
};

describe('buildGraph', () => {
  test('returns root node', () => {
    const graph = buildGraph(ROOT, []);
    expect(graph).to.equal(ROOT);
  });

  test('root node unmodified without plugins', () => {
    const original = JSON.parse(JSON.stringify(jsonify(ROOT)));
    const graph = buildGraph(ROOT, []);
    expect(graph).not.to.equal(original);
    expect(graph).to.deep.equal(original);
  });

  test('plugin can add children to root node', () => {
    const [testPlugin1, nodes1] = testPlugin(1);
    const graph = buildGraph(ROOT, [testPlugin1]);
    expect(graph).to.equal(ROOT);
    expect(graph.pluginChildren![testPlugin1.meta.id]).not.to.be.undefined;
    expect(graph.pluginChildren![testPlugin1.meta.id]).to.deep.equal(nodes1.get(ROOT.id));
  });

  test('plugin can add actions to root node', () => {
    const [testPlugin1] = testPlugin(1);
    const graph = buildGraph(ROOT, [testPlugin1]);
    expect(graph).to.equal(ROOT);
    expect(graph.pluginActions![testPlugin1.meta.id].length).to.equal(1);
  });

  test('multiple plugins can add children to root node', () => {
    const [testPlugin1, nodes1] = testPlugin(1);
    const [testPlugin2, nodes2] = testPlugin(2);
    const graph = buildGraph(ROOT, [testPlugin1, testPlugin2]);
    expect(graph).to.equal(ROOT);
    expect(graph.pluginChildren![testPlugin1.meta.id]).not.to.be.undefined;
    expect(graph.pluginChildren![testPlugin2.meta.id]).not.to.be.undefined;
    expect(graph.pluginChildren![testPlugin1.meta.id]).to.deep.equal(nodes1.get(ROOT.id));
    expect(graph.pluginChildren![testPlugin2.meta.id]).to.deep.equal(nodes2.get(ROOT.id));
  });

  test('multiple plugins can add actions to root node', () => {
    const [testPlugin1] = testPlugin(1);
    const [testPlugin2] = testPlugin(2);
    const graph = buildGraph(ROOT, [testPlugin1, testPlugin2]);
    expect(graph).to.equal(ROOT);
    expect(graph.pluginActions![testPlugin1.meta.id].length).to.equal(1);
    expect(graph.pluginActions![testPlugin2.meta.id].length).to.equal(1);
  });

  test('plugin can add children to child node', () => {
    const [testPlugin1, nodes1] = testPlugin(1, 2);
    const [testPlugin2, nodes2] = testPlugin(2);
    const graph = buildGraph(ROOT, [testPlugin1, testPlugin2]);
    expect(graph).to.equal(ROOT);
    expect(graph.pluginChildren![testPlugin1.meta.id]).to.deep.equal(nodes1.get(ROOT.id));
    expect(graph.pluginChildren![testPlugin2.meta.id]).to.deep.equal(nodes2.get(ROOT.id));
    expect(graph.pluginChildren![testPlugin1.meta.id][0].pluginChildren![testPlugin1.meta.id]).to.be.undefined;
    expect(graph.pluginChildren![testPlugin2.meta.id][0].pluginChildren![testPlugin1.meta.id]).not.to.be.undefined;
    expect(graph.pluginChildren![testPlugin2.meta.id][0].pluginChildren![testPlugin1.meta.id]).to.deep.equal(
      nodes1.get(graph.pluginChildren![testPlugin2.meta.id][0].id),
    );
  });

  test('plugin can add actions to child node', () => {
    const [testPlugin1] = testPlugin(1, 2);
    const [testPlugin2] = testPlugin(2);
    const graph = buildGraph(ROOT, [testPlugin1, testPlugin2]);
    expect(graph).to.equal(ROOT);
    expect(graph.pluginActions![testPlugin1.meta.id].length).to.equal(1);
    expect(graph.pluginActions![testPlugin2.meta.id].length).to.equal(1);
    expect(graph.pluginChildren![testPlugin2.meta.id][0].pluginActions![testPlugin1.meta.id].length).to.equal(1);
  });

  test('updates are emitted', async () => {
    const [testPlugin1, nodes1, update1] = testPlugin(1, 2);
    const [testPlugin2] = testPlugin(2);

    const pathRecieved = new Trigger<string[]>();
    const nodesRecieved = new Trigger<GraphNode | GraphNode[]>();
    const onUpdate = (path: string[], nodes: GraphNode | GraphNode[]) => {
      pathRecieved.wake(path);
      nodesRecieved.wake(nodes);
    };

    const graph = buildGraph(ROOT, [testPlugin1, testPlugin2], onUpdate);

    const plugin1Node = graph.pluginChildren![testPlugin1.meta.id][0];
    const plugin2Node = graph.pluginChildren![testPlugin2.meta.id][0];
    const newNode = {
      id: 'root-node22-node1',
      index: 'a1',
      label: 'root-node22-node1',
      parent: plugin1Node,
      pluginChildren: {},
      pluginActions: {},
    };
    nodes1.set(plugin2Node.id, [newNode]);
    update1.get(plugin2Node.id)!.emit();
    expect(await pathRecieved.wait()).to.deep.equal([
      'pluginChildren',
      testPlugin2.meta.id,
      '0',
      'pluginChildren',
      testPlugin1.meta.id,
    ]);
    expect(await nodesRecieved.wait()).to.deep.equal([newNode]);
  });
});
