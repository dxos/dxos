//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_INPUT, DEFAULT_OUTPUT } from '@dxos/conductor';
import { nodePorts } from '@dxos/react-ui-canvas';
import { createHistory } from '@dxos/react-ui-canvas-editor';

import { isValidComputeNode } from '../graph/index.ts';
import { createComputeGraph } from '../hooks/index.ts';
import { computeKinds, computeNodeRegistry } from '../registry.ts';
import { createRowPorts } from '../shapes/index.ts';
import { createControlCircuit, createTemplateCircuit, createTransformCircuit } from '../testing/index.ts';
import { CanvasBoard } from '../types/index.ts';
import { type BoardElement, boardLayout, createBoardStore } from './echo-store.ts';
import { createComputeProjection } from './projection.ts';

/** The template circuit as a board, written through the compute projection, with undo. */
const setup = () => {
  const circuit = createTemplateCircuit();
  const model = createComputeGraph(circuit);
  const board = CanvasBoard.make({ layout: { nodes: [...circuit.nodes], edges: [...circuit.edges] } });
  const store = createBoardStore(board, { projection: createComputeProjection({ controller: { graph: model } }) });
  const history = createHistory({ steps: { done: [], undone: [] }, source: store.source });
  const write = (intent: Parameters<typeof store.write>[0]) => history.record(() => store.write(intent));
  const elementOf = (type: string): BoardElement => {
    const element = Object.values(store.read().elements).find((element) => element.type === type);
    if (!element) {
      throw new Error(`no ${type} element`);
    }
    return element;
  };
  const computeIdOf = (type: string): string => {
    const node = elementOf(type).node;
    if (typeof node !== 'string') {
      throw new Error(`${type} carries no compute node`);
    }
    return node;
  };
  return { model, board, store, history, write, elementOf, computeIdOf };
};

const link = (id: string, source: BoardElement['source'], target: BoardElement['target']): BoardElement => ({
  id,
  type: 'link',
  z: 'z',
  source,
  target,
});

describe('compute scene', () => {
  test('a circuit reads as a layout of registered compute kinds, each carrying its compute node', ({ expect }) => {
    const circuit = createTemplateCircuit();
    createComputeGraph(circuit);
    const layout = boardLayout('circuit', circuit);
    const shapes = Object.values(layout.elements).filter((element) => element.type !== 'link');
    expect(shapes.length).toBe(circuit.nodes.length);
    expect(Object.keys(layout.elements).length).toBe(circuit.nodes.length + circuit.edges.length);
    for (const shape of shapes) {
      expect(computeKinds.has(shape.type ?? ''), shape.type).toBe(true);
      expect(computeKinds.validate(shape), shape.type).toEqual({ ok: true });
    }
    expect(
      shapes.filter((shape) => isValidComputeNode(shape.type ?? '')).every((shape) => typeof shape.node === 'string'),
    ).toBe(true);
  });

  test('a kind refuses an element whose own fields are not its shape', ({ expect }) => {
    const layout = boardLayout('circuit', createTemplateCircuit());
    const gpt = Object.values(layout.elements).find((element) => element.type === 'gpt');
    expect(gpt && computeKinds.validate({ ...gpt, center: 'here' }).ok).toBe(false);
  });

  test('a note keeps its text, and links pin the property ports', ({ expect }) => {
    const layout = boardLayout('circuit', createTransformCircuit());
    const elements = Object.values(layout.elements);
    expect(elements.find((element) => element.type === 'note')?.text).toBe('Random number generator');
    const expression = elements.find((element) => element.target?.port === 'input.expression');
    expect(expression?.source?.port).toBe(`output.${DEFAULT_OUTPUT}`);
  });

  test('ports follow the anchors: stacked inputs on the west side, outputs east, exact offsets', ({ expect }) => {
    const ifElse = createControlCircuit().nodes.find((node) => node.type === 'if-else');
    if (!ifElse) {
      throw new Error('no if-else node');
    }
    const ports = nodePorts(computeNodeRegistry, { ...ifElse, z: 'a' });
    const inputs = ports.filter((port) => port.accepts === 'in');
    const outputs = ports.filter((port) => port.accepts === 'out');
    expect(inputs.map((port) => port.side)).toEqual(['w', 'w', 'w']);
    expect(outputs.map((port) => port.side)).toEqual(['e']);
    const offsets = inputs.map((port) => port.offset);
    expect([...offsets].sort((left, right) => left - right)).toEqual(offsets);
    expect(createRowPorts({ size: { width: 10, height: 10 }, inputs: [], outputs: [] })).toEqual([]);
  });
});

describe('compute projection', () => {
  test('a new compute shape gets a compute node, and a pasted copy one of its own', ({ expect }) => {
    const { model, board, write, store } = setup();
    const nodes = model.nodes.length;
    const shape = { type: 'constant', z: 'zz', center: { x: 0, y: 0 }, size: { width: 192, height: 128 } };
    write({ kind: 'create', element: { id: 'k', ...shape } });
    const node = store.read().elements.k.node;
    expect(typeof node).toBe('string');
    expect(model.findNode(String(node))?.type).toBe('constant');
    const pasted = { id: 'k2', ...shape, node };
    write({ kind: 'create', element: pasted });
    const copy = store.read().elements.k2.node;
    expect(copy).not.toBe(node);
    expect(model.nodes.length).toBe(nodes + 2);
    // The compute node id is stored with the shape.
    expect(board.layout.nodes.find((shape) => shape.id === 'k')?.node).toBe(node);
  });

  test('a link to itself or to a missing shape adds no edge', ({ expect }) => {
    const { model, write, store, elementOf } = setup();
    const gpt = elementOf('gpt');
    const edges = model.edges.length;
    write({ kind: 'create', element: link('self', { node: gpt.id }, { node: gpt.id }) });
    write({ kind: 'bind', link: link('dangling', { node: gpt.id }, { node: 'missing' }) });
    expect(model.edges.length).toBe(edges);
    expect(store.read().elements.self).toBeUndefined();
    expect(store.read().elements.dangling).toBeUndefined();
  });

  test('parallel links with the same ends and ports delete distinct edges', ({ expect }) => {
    const { model, write, elementOf } = setup();
    const chat = elementOf('chat');
    const text = elementOf('text');
    const edges = model.edges.length;
    const ends = [
      { node: chat.id, port: `output.${DEFAULT_OUTPUT}` },
      { node: text.id, port: `input.${DEFAULT_INPUT}` },
    ] as const;
    write({ kind: 'create', element: link('one', ends[0], ends[1]) });
    write({ kind: 'create', element: link('two', ends[0], ends[1]) });
    expect(model.edges.length).toBe(edges + 2);
    write({ kind: 'delete', ids: ['one', 'two'] });
    expect(model.edges.length).toBe(edges);
  });

  test('moving a link end moves its edge; a freed end drops it', ({ expect }) => {
    const { model, write, store, elementOf, computeIdOf } = setup();
    const chat = elementOf('chat');
    const prompt = Object.values(store.read().elements).find((element) => element.target?.port === 'input.prompt');
    if (!prompt) {
      throw new Error('no prompt link');
    }
    const edges = model.edges.length;
    const edgeTo = (target: string) =>
      model.edges.filter((edge) => edge.source === computeIdOf('chat') && edge.target === target);
    expect(edgeTo(computeIdOf('gpt')).length).toBe(1);
    // The 2D viewport writes a changed element whole; a form writes the one field.
    write({
      kind: 'update',
      id: prompt.id,
      path: [],
      value: { ...prompt, target: { node: elementOf('text').id, port: `input.${DEFAULT_INPUT}` } },
    });
    expect(edgeTo(computeIdOf('gpt')).length).toBe(0);
    expect(edgeTo(computeIdOf('text')).length).toBe(1);
    write({ kind: 'update', id: prompt.id, path: ['target'], value: { point: chat.center } });
    expect(edgeTo(computeIdOf('text')).length).toBe(0);
    expect(model.edges.length).toBe(edges - 1);
  });

  test('a shape whose compute node is gone keeps drawing, and still deletes', ({ expect }) => {
    const { model, write, store, elementOf, computeIdOf } = setup();
    const gpt = elementOf('gpt');
    // A peer's delete removes the compute node first.
    model.removeNodes([computeIdOf('gpt')]);
    expect(store.read().elements[gpt.id]?.type).toBe('gpt');
    write({ kind: 'delete', ids: [gpt.id] });
    expect(store.read().elements[gpt.id]).toBeUndefined();
  });

  test('undoing an edit brings the compute graph back with the board', ({ expect }) => {
    const { model, history, write, store, elementOf, computeIdOf } = setup();
    const gpt = elementOf('gpt');
    const gptCompute = computeIdOf('gpt');
    const nodes = model.nodes.length;
    const edges = model.edges.length;
    const elements = Object.keys(store.read().elements).length;
    const incident = model.edges.filter((edge) => edge.source === gptCompute || edge.target === gptCompute).length;
    expect(incident).toBeGreaterThan(0);
    write({ kind: 'delete', ids: [gpt.id] });
    expect(model.findNode(gptCompute)).toBeUndefined();
    expect(model.edges.length).toBe(edges - incident);
    history.undo();
    expect(model.findNode(gptCompute)?.type).toBe('gpt');
    expect(model.nodes.length).toBe(nodes);
    expect(model.edges.length).toBe(edges);
    expect(Object.keys(store.read().elements).length).toBe(elements);

    write({
      kind: 'create',
      element: { id: 'k', type: 'constant', z: 'zz', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } },
    });
    expect(model.nodes.length).toBe(nodes + 1);
    history.undo();
    expect(model.nodes.length).toBe(nodes);
    expect(store.read().elements.k).toBeUndefined();
    history.redo();
    expect(model.nodes.length).toBe(nodes + 1);
  });
});
