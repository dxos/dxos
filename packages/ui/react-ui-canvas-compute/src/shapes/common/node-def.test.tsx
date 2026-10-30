//
// Copyright 2026 DXOS.org
//

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, test } from 'vitest';

import { type NodeViewProps, type View, staticLists } from '@dxos/react-ui-canvas/scene';
import { type Node } from '@dxos/scene';

import { ComputeGraphController } from '../../graph/index.ts';
import { ComputeContext, createComputeGraph } from '../../hooks/index.ts';
import { computeNodeRegistry } from '../../registry.ts';
import { createTemplateCircuit } from '../../testing/index.ts';

/** The template circuit's GPT shape, rendered through its registry view against a controller over the circuit. */
const setup = () => {
  const circuit = createTemplateCircuit();
  const model = createComputeGraph(circuit);
  const controller = new ComputeGraphController(
    { runPromiseExit: () => Promise.reject(new Error('The view test runs no graph.')) },
    model,
  );
  const gpt = circuit.nodes.find((node) => node.type === 'gpt');
  if (!gpt || typeof gpt.node !== 'string') {
    throw new Error('The circuit has no GPT shape with a compute node.');
  }
  const shape = { ...gpt, z: 'a', node: gpt.node };
  const scene: View = { id: 'circuit', nodes: { [shape.id]: shape as Node }, links: {} };
  const View = computeNodeRegistry.gpt.component;
  const props: NodeViewProps = {
    node: shape as Node,
    scene,
    lists: staticLists([scene]),
    registry: computeNodeRegistry,
    zoom: 1,
    depth: 0,
    liveDepth: 1,
    selected: false,
  };
  const render = () =>
    renderToStaticMarkup(
      <ComputeContext.Provider value={{ controller }}>
        <View {...props} />
      </ComputeContext.Provider>,
    );
  return { model, computeId: shape.node, render };
};

describe('compute node view', () => {
  test('a shape whose compute node is gone renders its placeholder, not its live component', ({ expect }) => {
    const { model, computeId, render } = setup();
    const placeholder = `>${computeNodeRegistry.gpt.name}</span>`;
    expect(render()).not.toContain(placeholder);
    model.removeNodes([computeId]);
    expect(render()).toContain(placeholder);
  });
});
