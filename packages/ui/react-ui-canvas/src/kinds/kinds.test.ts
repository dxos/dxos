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

/** A plugin kind: the element base, its title in the base's `label`, and its own fields under `data`. */
const Sticky = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('sticky'),
  label: Schema.String,
  data: Schema.Struct({ votes: Schema.Number }),
});

const sticky: ElementKindSpec = {
  name: 'Sticky',
  icon: 'ph--note--regular',
  schema: Sticky,
  create: ({ id, z, center, size }) => ({ type: 'sticky', id, z, center, size, label: 'Note', data: { votes: 0 } }),
  defaultSize: { width: 1, height: 1 },
};

const kinds = kindRegistry({ sticky });

const frame = { id: 's', z: 'a1', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } };

const layout: Scene.LayoutRecord2D = {
  id: 'main',
  dim: '2d',
  elements: {
    s: { type: 'sticky', ...frame, label: 'Hi', data: { votes: 2 }, portsPerSide: 2, props: { other: true } },
    r: { id: 'r', type: 'rect', z: 'a2', center: { x: 0, y: 0 }, size: { width: 64, height: 64 } },
  },
};

describe('element kinds', () => {
  test("the engine's node type carries the kind's data and label over the node base", () => {
    const def = kindNodeDef('sticky', sticky);
    const node = def.create?.(frame);
    expect(node).toEqual({ ...frame, type: 'sticky', label: 'Note', data: { votes: 0 } });
    expect(def.schema && Schema.is(def.schema)(node)).toBe(true);
    expect(def.schema && Schema.is(def.schema)({ ...node, data: { votes: 'many' } })).toBe(false);
    expect(kinds.validate({ ...frame, type: 'sticky', label: 'x', data: { votes: 'many' } }).ok).toBe(false);
  });

  test("a kind that declares a field of its own at its top is refused, unless a prototype's frame reads it", () => {
    const flat = Schema.Struct({ ...Scene.Element2D.fields, type: Schema.Literal('flat'), votes: Schema.Number });
    expect(() => kindNodeDef('flat', { ...sticky, schema: flat })).toThrow(/votes/);
    // A card's `body` is the core card's, which its frame reads from the node itself.
    const card = Schema.Struct({ ...Scene.Element2D.fields, type: Schema.Literal('memo'), body: Schema.String });
    expect(() => kindNodeDef('memo', { ...sticky, extends: 'card', schema: card })).not.toThrow();
  });

  test("a kind's data and the engine's fields are drawn under the canvas fields; other elements as stored", () => {
    const drawn = toViewportLayout(layout, kinds);
    expect(drawn.elements.s).toEqual({
      ...frame,
      type: 'sticky',
      label: 'Hi',
      props: { other: true, canvas: { data: { votes: 2 }, portsPerSide: 2 } },
    });
    expect(drawn.elements.r).toBe(layout.elements.r);
    expect(toViewportDocument({ scenes: [], layouts: [layout], models: [] }, kinds).layouts[0]).toEqual(drawn);
  });

  test('a created element is stored with its data at its top and no canvas fields', () => {
    const drawn = toViewportLayout(layout, kinds).elements.s;
    const intent = fromViewportIntent({ kind: 'create', element: { ...drawn, id: 'copy' } }, layout, kinds);
    expect(intent).toEqual({
      kind: 'create',
      element: { ...layout.elements.s, id: 'copy' },
    });
  });

  test('derived fields are drawn and never written back', () => {
    const ports = [{ id: 'in', side: 'w' as const, offset: 0.5 }];
    const drawn = toViewportLayout(layout, kinds, () => ports).elements.s;
    const intent = fromViewportIntent({ kind: 'update', id: 's', path: [], value: drawn }, layout, kinds, ['ports']);
    expect(intent.kind === 'update' && intent.value).toEqual(layout.elements.s);
  });

  test('a field of data the write leaves alone keeps its stored value, whatever else in data changes', () => {
    // A reference among a kind's fields: the engine hands back an equal copy, which must not replace the original.
    const owner = { uri: 'dxn:owner' };
    const stored: Scene.LayoutRecord2D = {
      ...layout,
      elements: { s: { ...layout.elements.s, data: { votes: 2, owner } } },
    };
    const drawn = toViewportLayout(stored, kinds).elements.s;
    const canvas = drawn.props?.canvas;
    const edited = {
      ...drawn,
      props: { ...drawn.props, canvas: { ...canvas, data: { votes: 3, owner: { ...owner } } } },
    };
    const intent = fromViewportIntent({ kind: 'update', id: 's', path: [], value: edited }, stored, kinds);
    const value = intent.kind === 'update' ? Object(intent.value) : {};
    expect(value.data).toEqual({ votes: 3, owner });
    expect(value.data.owner).toBe(owner);
    // Nothing of `data` changed: the stored `data` itself is kept.
    const same = fromViewportIntent({ kind: 'update', id: 's', path: [], value: drawn }, stored, kinds);
    expect(same.kind === 'update' && Object(same.value).data).toBe(stored.elements.s.data);
  });

  test("an element stored with its kind's fields at its top draws them as data, and its next write stores them there", () => {
    const { data, ...base } = layout.elements.s;
    const stored: Scene.LayoutRecord2D = { ...layout, elements: { s: { ...base, votes: 5 } } };
    const drawn = toViewportLayout(stored, kinds).elements.s;
    expect(drawn.props?.canvas).toEqual({ data: { votes: 5 }, portsPerSide: 2 });
    const intent = fromViewportIntent({ kind: 'update', id: 's', path: [], value: drawn }, stored, kinds);
    expect(intent.kind === 'update' && intent.value).toEqual({ ...base, data: { votes: 5 } });
    // Both forms at once: `data` is the newer, so it wins.
    const both: Scene.LayoutRecord2D = { ...layout, elements: { s: { ...base, votes: 5, data: { votes: 7 } } } };
    expect(toViewportLayout(both, kinds).elements.s.props?.canvas).toMatchObject({ data: { votes: 7 } });
  });
});
