//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { createSceneSchema, nodePorts } from '@dxos/react-ui-canvas/scene';

import { createComputeGraph } from '../hooks/index.ts';
import { createControlCircuit, createTemplateCircuit, createTransformCircuit } from '../testing/index.ts';
import { computeNodeDefs, computeNodeRegistry } from './defs.ts';
import { anchorsToPorts } from './ports.ts';
import { sceneFromCircuit } from './scene.ts';

describe('compute scene', () => {
  test('the circuit becomes a scene the compute schema union accepts', ({ expect }) => {
    const circuit = createTemplateCircuit();
    createComputeGraph(circuit);
    const scene = sceneFromCircuit(circuit);
    const ComputeScene = createSceneSchema(computeNodeDefs.map((def) => def.schema));
    expect(Schema.is(ComputeScene)(scene)).toBe(true);
    expect(Object.keys(scene.nodes).length).toBe(circuit.nodes.length);
    expect(Object.keys(scene.links).length).toBe(circuit.edges.length);
    // Every compute shape carries its compute node id into the scene.
    expect(Object.values(scene.nodes).every((node) => 'node' in node && typeof node.node === 'string')).toBe(true);
  });

  test('a note becomes the engine text node and edges pin the property ports', ({ expect }) => {
    const circuit = createTransformCircuit();
    const scene = sceneFromCircuit(circuit);
    const note = Object.values(scene.nodes).find((node) => node.type === 'text');
    expect(note && 'text' in note && note.text).toBe('Random number generator');
    const expression = Object.values(scene.links).find(
      (link) => 'port' in link.target && link.target.port === `input.expression`,
    );
    expect(expression && 'port' in expression.source && expression.source.port).toBe(`output.${DEFAULT_OUTPUT}`);
    const plain = Object.values(scene.links).find(
      (link) => 'port' in link.target && link.target.port === `input.${DEFAULT_INPUT}`,
    );
    expect(plain?.directed).toBe(true);
  });

  test('ports follow the anchors: stacked inputs on the west side, outputs east, exact offsets', ({ expect }) => {
    const scene = sceneFromCircuit(createControlCircuit());
    const ifElse = Object.values(scene.nodes).find((node) => node.type === 'if-else');
    if (!ifElse) {
      throw new Error('no if-else node');
    }
    const ports = nodePorts(computeNodeRegistry, ifElse);
    const inputs = ports.filter((port) => port.accepts === 'in');
    const outputs = ports.filter((port) => port.accepts === 'out');
    expect(inputs.map((port) => port.side)).toEqual(['w', 'w', 'w']);
    expect(outputs.map((port) => port.side)).toEqual(['e']);
    expect(inputs.every((port) => port.snap === false)).toBe(true);
    // Rows keep their order down the side.
    const offsets = inputs.map((port) => port.offset);
    expect([...offsets].sort((left, right) => left - right)).toEqual(offsets);
    expect(anchorsToPorts({}, { width: 10, height: 10 })).toEqual([]);
  });
});
