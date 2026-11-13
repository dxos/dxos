//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { fromViewportIntent, toViewportLayout } from '@dxos/react-ui-canvas';
import { type LayoutIntent } from '@dxos/scene';

import { createComputeGraph } from '../hooks/index.ts';
import { computeKinds } from '../registry.ts';
import { createTemplateCircuit } from '../testing/index.ts';
import { type BoardElement, boardLayout, computeNodeId } from './echo-store.ts';

// One circuit for the file, since its ids are random; building its compute graph gives each shape its compute node.
const template = createTemplateCircuit();
createComputeGraph(template);
const circuit = boardLayout('circuit', template);
const layout = () => circuit;

const elementOf = (type: string): BoardElement => {
  const element = Object.values(circuit.elements).find((element) => element.type === type);
  if (!element) {
    throw new Error(`no ${type} element`);
  }
  return element;
};

describe('viewport form', () => {
  test("a compute element is drawn with its kind's fields where the 2D viewport reads a node's own", ({ expect }) => {
    const gpt = elementOf('gpt');
    const drawn = toViewportLayout(layout(), computeKinds).elements[gpt.id];
    expect(drawn.props?.canvas).toEqual({ data: { node: computeNodeId(gpt) } });
    expect('data' in drawn).toBe(false);
    expect(drawn).toMatchObject({ id: gpt.id, type: 'gpt', z: gpt.z, center: gpt.center, size: gpt.size });
  });

  test('runtime ports are drawn, and never written back', ({ expect }) => {
    const gpt = elementOf('gpt');
    const ports = [{ id: 'input.prompt', side: 'w' as const, offset: 0.5 }];
    const drawn = toViewportLayout(layout(), computeKinds, (element) => (element.id === gpt.id ? ports : undefined));
    expect(drawn.elements[gpt.id].props?.canvas).toMatchObject({ ports });
    const moved = { ...drawn.elements[gpt.id], center: { x: 1, y: 2 } };
    const intent = fromViewportIntent({ kind: 'update', id: gpt.id, path: [], value: moved }, layout(), computeKinds, [
      'ports',
    ]);
    expect(intent).toEqual<LayoutIntent>({
      kind: 'update',
      id: gpt.id,
      path: [],
      value: { ...gpt, center: { x: 1, y: 2 } },
    });
  });

  test("a written compute element's data goes back to its top, keeping the stored value it still equals", ({
    expect,
  }) => {
    const stored = layout();
    const gpt = elementOf('gpt');
    const reference = { target: 'kept' };
    const data = { ...gpt.data, functionTrigger: reference };
    const current = { ...stored, elements: { ...stored.elements, [gpt.id]: { ...gpt, data } } };
    const drawn = toViewportLayout(current, computeKinds).elements[gpt.id];
    const written = JSON.parse(JSON.stringify(drawn));
    const created = fromViewportIntent(
      { kind: 'batch', intents: [{ kind: 'create', element: { ...written, id: 'copy' } }] },
      current,
      computeKinds,
    );
    expect(created.kind === 'batch' && created.intents[0]).toMatchObject({
      kind: 'create',
      element: { id: 'copy', data: { node: computeNodeId(gpt), functionTrigger: { target: 'kept' } } },
    });
    const updated = fromViewportIntent({ kind: 'update', id: gpt.id, path: [], value: written }, current, computeKinds);
    // The engine wrote a copy of the data; the stored one is kept, so a reference in it stays a reference.
    expect(updated.kind === 'update' && Reflect.get(Object(updated.value), 'data')).toBe(data);
  });

  test("an element with its kind's fields at its top is drawn with them as data, and written back with them there", ({
    expect,
  }) => {
    const stored = layout();
    const { data, ...constant } = elementOf('constant');
    const flat = { ...constant, node: computeNodeId({ data }), value: 'DXOS' };
    const current = { ...stored, elements: { ...stored.elements, [flat.id]: flat } };
    const drawn = toViewportLayout(current, computeKinds).elements[flat.id];
    expect(drawn.props?.canvas).toEqual({ data: { node: flat.node, value: 'DXOS' } });
    const updated = fromViewportIntent({ kind: 'update', id: flat.id, path: [], value: drawn }, current, computeKinds);
    expect(updated.kind === 'update' && updated.value).toEqual({
      ...constant,
      data: { node: flat.node, value: 'DXOS' },
    });
  });

  test('links and other kinds are drawn as stored', ({ expect }) => {
    const stored = layout();
    const drawn = toViewportLayout(stored, computeKinds);
    const link = Object.values(stored.elements).find((element) => element.type === 'link');
    expect(link && drawn.elements[link.id]).toEqual(link);
  });
});
