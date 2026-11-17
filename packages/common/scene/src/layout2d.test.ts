//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, expect, test } from 'vitest';

import { Obj } from '@dxos/echo';

import { fromEcho, toEcho } from './echo.ts';
import { KindRegistry } from './kinds.ts';
import * as Scene from './Scene.ts';
import { layout2D, scene2D } from './testing.ts';

/** A plugin kind: the element base, and the kind's own fields under `data`. */
const Sticky = Schema.Struct({
  ...Scene.Element2D.fields,
  type: Schema.Literal('sticky'),
  data: Schema.Struct({ author: Schema.String, votes: Schema.optional(Schema.Number) }),
});

const sticky = { id: 's', type: 'sticky', center: { x: 0, y: 0 }, data: { author: 'ada', votes: 3 } };

describe('Layout2D', () => {
  test('an unknown kind keeps its fields', () => {
    const layout = layout2D('main', [sticky]);
    const document: Scene.SceneDocument = { scenes: [scene2D('root', 'main')], layouts: [layout], models: [] };
    const { root, layouts } = toEcho(document);
    const stored = layouts.get('main');
    expect(Obj.instanceOf(Scene.Layout2D, stored) && stored.elements.s).toMatchObject({
      data: { author: 'ada', votes: 3 },
    });
    expect(fromEcho(root).layouts[0].elements.s).toEqual(sticky);
  });

  test('the registry rejects a bad field of a registered kind', () => {
    const registry = new KindRegistry().register('sticky', Sticky);
    expect(registry.validate(sticky)).toEqual({ ok: true });
    expect(registry.validate({ ...sticky, data: { author: 7 } }).ok).toBe(false);
    expect(registry.validate({ id: 'r', type: 'rect', data: { author: 7 } })).toEqual({ ok: true });
  });

  test("an element stored with its kind's fields at its top reads with them under data, where data wins", () => {
    const registry = new KindRegistry().register('sticky', Sticky);
    expect(registry.dataFields('sticky')).toEqual(['author', 'votes']);
    // A kind whose fields are all optional may leave `data` out altogether; its fields are still known.
    const Tag = Schema.Struct({
      ...Scene.Element2D.fields,
      type: Schema.Literal('tag'),
      data: Schema.optional(Schema.Struct({ tone: Schema.optional(Schema.String) })),
    });
    const tags = new KindRegistry().register('tag', Tag);
    expect(tags.dataFields('tag')).toEqual(['tone']);
    expect(tags.normalize({ id: 't', type: 'tag', tone: 'ink' })).toEqual({
      id: 't',
      type: 'tag',
      data: { tone: 'ink' },
    });
    const { data, ...base } = sticky;
    const flat = { ...base, ...data };
    expect(registry.normalize(flat)).toEqual(sticky);
    expect(registry.validate(flat)).toEqual({ ok: true });
    expect(registry.normalize({ ...flat, data: { votes: 9 } })).toEqual({ ...base, data: { author: 'ada', votes: 9 } });
    // Nothing of the kind's at the top, and a type that is not registered: as stored.
    expect(registry.normalize(sticky)).toBe(sticky);
    const rect = { id: 'r', type: 'rect', author: 'ada' };
    expect(registry.normalize(rect)).toBe(rect);
  });

  test('a layout carries the View fields: layers, kind, lattice and constraints', () => {
    const layout: Scene.LayoutRecord2D = {
      ...layout2D('main', [
        { id: 'a', type: 'rect' },
        { id: 'b', type: 'rect' },
      ]),
      layers: { front: { id: 'front', name: 'Front', z: 'a1' } },
      kind: 'composite',
      anonymous: true,
      lattice: { width: 256, height: 128, gutterX: 128, gutterY: 64 },
      constraints: [{ subject: 'a', relation: 'east', object: 'b' }],
    };
    const document: Scene.SceneDocument = { scenes: [scene2D('root', 'main')], layouts: [layout], models: [] };
    expect(fromEcho(toEcho(document).root).layouts[0]).toEqual(layout);
  });
});
