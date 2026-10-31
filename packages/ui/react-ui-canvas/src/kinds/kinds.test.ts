//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Scene } from '@dxos/scene';

import {
  type ElementKindSpec,
  fromViewportIntent,
  kindNodeDef,
  kindRegistry,
  toViewportDocument,
  toViewportLayout,
} from './kinds.ts';

/** A plugin kind as decision 13 defines one: the element base plus the kind's own fields. */
const Sticky = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('sticky'),
  label: Schema.String,
  votes: Schema.Number,
});

const sticky: ElementKindSpec = {
  name: 'Sticky',
  icon: 'ph--note--regular',
  schema: Sticky,
  create: ({ id, z, center, size }) => ({ type: 'sticky', id, z, center, size, label: 'Note', votes: 0 }),
  defaultSize: { width: 1, height: 1 },
};

const kinds = kindRegistry({ sticky });

const frame = { id: 's', z: 'a1', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };

const layout: Scene.LayoutRecord2D = {
  id: 'main',
  dim: '2d',
  elements: {
    s: { type: 'sticky', ...frame, label: 'Hi', votes: 2, props: { other: true } },
    r: { id: 'r', type: 'rect', z: 'a2', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } },
  },
};

describe('element kinds', () => {
  test("the engine's node type carries the kind's own fields and label over the node base", () => {
    const def = kindNodeDef('sticky', sticky);
    const node = def.create?.(frame);
    expect(node).toEqual({ ...frame, type: 'sticky', label: 'Note', votes: 0 });
    expect(def.schema && Schema.is(def.schema)(node)).toBe(true);
    expect(kinds.validate({ ...frame, type: 'sticky', label: 'x', votes: 'many' }).ok).toBe(false);
  });

  test("a kind's fields are drawn under the canvas fields; other elements as stored", () => {
    const drawn = toViewportLayout(layout, kinds);
    expect(drawn.elements.s).toEqual({
      ...frame,
      type: 'sticky',
      label: 'Hi',
      props: { other: true, canvas: { votes: 2 } },
    });
    expect(drawn.elements.r).toBe(layout.elements.r);
    expect(toViewportDocument({ scenes: [], layouts: [layout], models: [] }, kinds).layouts[0]).toEqual(drawn);
  });

  test('a created element is stored with its fields at its top and no canvas fields', () => {
    const drawn = toViewportLayout(layout, kinds).elements.s;
    const intent = fromViewportIntent({ kind: 'create', element: { ...drawn, id: 'copy' } }, layout, kinds);
    expect(intent).toEqual({
      kind: 'create',
      element: { ...frame, id: 'copy', type: 'sticky', label: 'Hi', votes: 2, props: { other: true } },
    });
  });

  test('derived fields are drawn and never written back', () => {
    const ports = [{ id: 'in', side: 'w' as const, offset: 0.5 }];
    const drawn = toViewportLayout(layout, kinds, () => ports).elements.s;
    const intent = fromViewportIntent({ kind: 'update', id: 's', path: [], value: drawn }, layout, kinds, ['ports']);
    expect(intent.kind === 'update' && intent.value).toEqual(layout.elements.s);
  });
});
