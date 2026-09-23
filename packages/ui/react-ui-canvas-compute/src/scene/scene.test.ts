//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import * as Registry from 'effect/unstable/reactivity/AtomRegistry';
import { describe, test } from 'vitest';

import { Event } from '@dxos/async';
import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { type Link, type Node, createMemoryStore, createSceneSchema, nodePorts } from '@dxos/react-ui-canvas/scene';

import { createComputeGraph } from '../hooks/index.ts';
import { createControlCircuit, createTemplateCircuit, createTransformCircuit } from '../testing/index.ts';
import { computeNodeDefs, computeNodeRegistry } from './defs.ts';
import { anchorsToPorts } from './ports.ts';
import { createComputeProjection } from './projection.ts';
import { sceneFromCircuit } from './scene.ts';

/** The template circuit under a compute projection over a memory store. */
const setup = () => {
  const circuit = createTemplateCircuit();
  const model = createComputeGraph(circuit);
  const initial = sceneFromCircuit(circuit);
  const registry = Registry.make();
  const store = createMemoryStore([initial]);
  const projection = createComputeProjection({
    registry,
    store,
    sceneId: initial.id,
    controller: { graph: model, update: new Event() },
  });
  const scene = () => registry.get(projection.scene);
  const nodeOf = (type: string): Node => {
    const node = Object.values(scene().nodes).find((node) => node.type === type);
    if (!node) {
      throw new Error(`no ${type} node`);
    }
    return node;
  };
  const computeIdOf = (type: string): string => {
    const node = nodeOf(type);
    if (!('node' in node) || typeof node.node !== 'string') {
      throw new Error(`${type} carries no compute node`);
    }
    return node.node;
  };
  return { model, projection, scene, nodeOf, computeIdOf };
};

const line = (id: string, source: Link['source'], target: Link['target']): Link => ({
  type: 'line',
  id,
  z: id,
  source,
  target,
});

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
    const note = Object.values(scene.nodes).find((node) => node.type === 'note');
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
    // Rows keep their order down the side.
    const offsets = inputs.map((port) => port.offset);
    expect([...offsets].sort((left, right) => left - right)).toEqual(offsets);
    expect(anchorsToPorts({}, { width: 10, height: 10 })).toEqual([]);
  });
});

describe('compute projection', () => {
  test('a link the scene refuses adds no edge', ({ expect }) => {
    const { model, projection, scene, nodeOf } = setup();
    const gpt = nodeOf('gpt');
    const edges = model.edges.length;
    projection.apply({ kind: 'link', link: line('self', { node: gpt.id }, { node: gpt.id }) });
    projection.apply({ kind: 'link', link: line('dangling', { node: gpt.id }, { node: 'missing' }) });
    expect(model.edges.length).toBe(edges);
    expect(scene().links.self).toBeUndefined();
    expect(scene().links.dangling).toBeUndefined();
  });

  test('parallel links with the same ends and ports delete distinct edges', ({ expect }) => {
    const { model, projection, nodeOf } = setup();
    const chat = nodeOf('chat');
    const text = nodeOf('text');
    const edges = model.edges.length;
    const ends = [
      { node: chat.id, port: `output.${DEFAULT_OUTPUT}` },
      { node: text.id, port: `input.${DEFAULT_INPUT}` },
    ];
    projection.apply({ kind: 'link', link: line('one', ends[0], ends[1]) });
    projection.apply({ kind: 'link', link: line('two', ends[0], ends[1]) });
    expect(model.edges.length).toBe(edges + 2);
    projection.apply({ kind: 'delete', ids: ['one', 'two'] });
    expect(model.edges.length).toBe(edges);
  });

  test('dragging a link end moves its edge; a freed end drops it', ({ expect }) => {
    const { model, projection, scene, nodeOf, computeIdOf } = setup();
    const chat = nodeOf('chat');
    const gpt = computeIdOf('gpt');
    const text = computeIdOf('text');
    const prompt = Object.values(scene().links).find(
      (link) => 'port' in link.target && link.target.port === 'input.prompt',
    );
    if (!prompt) {
      throw new Error('no prompt link');
    }
    const edges = model.edges.length;
    const edgeTo = (target: string) =>
      model.edges.filter((edge) => edge.source === computeIdOf('chat') && edge.target === target);
    expect(edgeTo(gpt).length).toBe(1);
    projection.apply({
      kind: 'update',
      id: prompt.id,
      values: { target: { node: nodeOf('text').id, port: `input.${DEFAULT_INPUT}` } },
    });
    expect(edgeTo(gpt).length).toBe(0);
    expect(edgeTo(text).length).toBe(1);
    projection.apply({ kind: 'update', id: prompt.id, values: { target: { point: chat.center } } });
    expect(edgeTo(text).length).toBe(0);
    expect(model.edges.length).toBe(edges - 1);
  });

  test('restoring a snapshot brings the compute graph back with it', ({ expect }) => {
    const { model, projection, scene, nodeOf, computeIdOf } = setup();
    const gpt = nodeOf('gpt');
    const gptCompute = computeIdOf('gpt');
    const nodes = model.nodes.length;
    const edges = model.edges.length;
    const links = Object.keys(scene().links).length;
    const incident = model.edges.filter((edge) => edge.source === gptCompute || edge.target === gptCompute).length;
    expect(incident).toBeGreaterThan(0);
    const before = projection.snapshot();
    projection.apply({ kind: 'delete', ids: [gpt.id] });
    expect(model.findNode(gptCompute)).toBeUndefined();
    expect(model.edges.length).toBe(edges - incident);
    projection.restore(before);
    expect(model.findNode(gptCompute)?.type).toBe('gpt');
    expect(model.nodes.length).toBe(nodes);
    expect(model.edges.length).toBe(edges);
    expect(Object.keys(scene().links).length).toBe(links);

    const created = projection.snapshot();
    const node = computeNodeRegistry.constant.create({
      id: 'k',
      z: 'z',
      center: { x: 0, y: 0 },
      size: { width: 64, height: 64 },
    });
    projection.apply({ kind: 'create', node });
    expect(model.nodes.length).toBe(nodes + 1);
    projection.restore(created);
    expect(model.nodes.length).toBe(nodes);
    expect(scene().nodes.k).toBeUndefined();
  });
});
