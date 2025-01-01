//
// Copyright 2024 DXOS.org
//

import { describe, test } from 'vitest';

import { Trigger } from '@dxos/async';
import { createEdgeId, type GraphNode } from '@dxos/graph';
import { log } from '@dxos/log';

import { type AbstractComputeNode, createComputeGraph } from './compute-graph';
import { AndGate, Beacon, Switch } from './node-types';
import { StateMachine } from './state-machine';
import { createId } from '../../testing';

describe('state machine', () => {
  test('construct', async ({ expect }) => {
    const graph = createComputeGraph();

    // TODO(burdon): data should be object. Define schema for compute.

    // TODO(burdon): Builder pattern.
    const [a, b, c, d]: GraphNode<AbstractComputeNode<any, any>>[] = [
      { id: createId(), data: new Switch().setState(false) },
      { id: createId(), data: new Switch().setState(true) },
      { id: createId(), data: new AndGate() },
      { id: createId(), data: new Beacon() },
    ];

    graph.addNode(a);
    graph.addNode(b);
    graph.addNode(c);
    graph.addNode(d);
    graph.addEdge({
      id: createEdgeId({ source: a.id, target: b.id, relation: 'computes' }),
      source: a.id,
      target: c.id,
      data: { property: 'a' },
    });
    graph.addEdge({
      id: createEdgeId({ source: a.id, target: a.id, relation: 'computes' }),
      source: b.id,
      target: c.id,
      data: { property: 'b' },
    });
    graph.addEdge({
      id: createEdgeId({ source: a.id, target: a.id, relation: 'computes' }),
      source: c.id,
      target: d.id,
      data: undefined,
    });

    const machine = new StateMachine(graph);
    void machine.open();

    const done = new Trigger<boolean>();
    machine.update.on((ev) => {
      log.info('update', ev);
      if (d.data.value === true) {
        done.wake(true);
      }
    });

    expect(c.data.value).to.be.undefined;
    void machine.exec();

    // TODO(burdon): Updating values should automatically trigger computation.
    a.data.setState(true);
    void machine.exec(a);

    await done.wait();
    expect(d.data.value).to.be.true;
    void machine.close();
  });
});
