//
// Copyright 2024 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { createEdgeId, type GraphNode } from '@dxos/graph';

import { createComputeGraph } from './compute-graph';
import { DEFAULT_INPUT, DEFAULT_OUTPUT, type ComputeNode } from './compute-node';
import { AndGate, Beacon, Switch } from './nodes';
import { StateMachine } from './state-machine';
import { createId } from '../../testing';
import { log } from '@dxos/log';

describe('state machine', () => {
  test('construct', async ({ expect }) => {
    const { graph, nodes } = createAndGateGraph();

    await using machine = await new StateMachine(graph).open();
    expect(machine.isOpen).to.be.true;
    expect(nodes.c.data.input!.a).to.be.undefined;
    expect(nodes.c.data.input!.b).to.be.undefined;
    await machine.exec();

    // // TODO(burdon): Updating values should automatically trigger computation.
    nodes.a.data.setEnabled(true);
    await machine.exec(nodes.a);
    expect(nodes.d.data.input[DEFAULT_INPUT]).to.be.true;
    void machine.close();
  });

  test('toJSON', async () => {
    const { graph } = createAndGateGraph();
    await using machine = await new StateMachine(graph).open();
    const json = machine.toJSON();
    expect(json).to.deep.equal({
      graph: {
        nodes: 4,
        edges: 3,
      },
    });
  });
});

const createAndGateGraph = () => {
  const graph = createComputeGraph();
  const a = { id: createId(), data: new Switch().setEnabled(false) };
  const b = { id: createId(), data: new Switch().setEnabled(true) };
  const c = { id: createId(), data: new AndGate() };
  const d = { id: createId(), data: new Beacon() };
  graph.addNode(a);
  graph.addNode(b);
  graph.addNode(c);
  graph.addNode(d);
  graph.addEdge({
    id: createEdgeId({ source: a.id, target: c.id, relation: 'invokes' }),
    source: a.id,
    target: c.id,
    data: { output: DEFAULT_OUTPUT, input: 'a' },
  });
  graph.addEdge({
    id: createEdgeId({ source: b.id, target: c.id, relation: 'invokes' }),
    source: b.id,
    target: c.id,
    data: { output: DEFAULT_OUTPUT, input: 'b' },
  });
  graph.addEdge({
    id: createEdgeId({ source: c.id, target: d.id, relation: 'invokes' }),
    source: c.id,
    target: d.id,
    data: { output: DEFAULT_OUTPUT, input: DEFAULT_INPUT },
  });
  return {
    graph,
    nodes: { a, b, c, d },
  };
};
