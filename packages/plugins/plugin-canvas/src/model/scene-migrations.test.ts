//
// Copyright 2026 DXOS.org
//

import { afterEach, beforeEach, describe, test } from 'vitest';

import { Filter, Obj, Ref } from '@dxos/echo';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import { toRenderList2D } from '@dxos/react-ui-canvas/headless';
import { Legacy, Scene, StyleCatalog, fromEcho } from '@dxos/scene';

let builder: EchoTestBuilder;

beforeEach(async () => {
  builder = await new EchoTestBuilder().open();
});

afterEach(async () => {
  await builder.close();
});

const setup = async () => {
  const { db, graph } = await builder.createDatabase();
  graph.registry.add([
    Legacy.Layout2D,
    Legacy.Layout3D,
    Legacy.Model2D,
    Legacy.Model3D,
    Legacy.StyleCatalog,
    Scene.Layout2D,
    Scene.Layout3D,
    Scene.Model2D,
    Scene.Model3D,
    Scene.Scene2D,
    StyleCatalog,
  ]);
  return db;
};

const frame = { center: { x: 0, y: 0 }, size: { width: 96, height: 48 } };

describe('stored scene types at version 0.2.0', () => {
  test('a drawing stored before it is rewritten in place, and draws as it did', async ({ expect }) => {
    const db = await setup();
    // A card's parts, a model whose object places them, and the layout that places the object: as version 0.1.0 stored them.
    const parts = db.add(
      Obj.make(Legacy.Layout2D, {
        key: 'card',
        kind: 'composite',
        elements: {
          title: { id: 'title', type: 'note', z: 'a0', ...frame, props: { canvas: { text: 'Title' } } },
        },
      }),
    );
    const model = db.add(
      Obj.make(Legacy.Model2D, {
        key: 'model',
        objects: { 'instance:card': { id: 'instance:card', type: 'rect', parts: Ref.make(parts) } },
        styles: { warn: { name: 'Warn', hue: 'amber', tone: 3, border: false } },
      }),
    );
    const main = db.add(
      Obj.make(Legacy.Layout2D, {
        key: 'main',
        model: Ref.make(model),
        layers: { base: { id: 'base', name: 'Base', z: 'a0' } },
        elements: {
          a: {
            id: 'a',
            type: 'rect',
            z: 'a0',
            ...frame,
            label: 'A',
            layer: 'base',
            style: 'warn',
            overrides: { hue: 'red', tone: 1, rounded: true, fontFamily: 'monospace' },
            props: { canvas: { ports: [{ id: 'out', side: 'e', offset: 0.5 }] } },
          },
          card: {
            id: 'card',
            object: 'instance:card',
            z: 'a1',
            center: { x: 200, y: 0 },
            size: { width: 96, height: 48 },
            layer: 'base',
            props: { canvas: { type: 'instance', composite: 'card', overrides: { title: { text: 'Mine' } } } },
          },
          link: {
            id: 'link',
            type: 'link',
            z: 'a2',
            layer: 'base',
            source: { node: 'a', port: 'out' },
            target: { node: 'card' },
            label: 'uses',
            props: { canvas: { type: 'ortho', ends: { end: 'many' } } },
          },
        },
        constraints: [{ subject: 'card', relation: 'east', object: 'a' }],
      }),
    );
    const catalog = db.add(
      Obj.make(Legacy.StyleCatalog, {
        key: 'brand',
        name: 'Brand',
        dim: '2d',
        styles: { accent: { hue: 'violet', lineStyle: 'dashed' } },
      }),
    );
    const ids = { parts: parts.id, model: model.id, main: main.id, catalog: catalog.id };
    await db.flush();

    await db.runMigrations([...Legacy.Migrations]);

    for (const type of [Legacy.Layout2D, Legacy.Model2D, Legacy.StyleCatalog]) {
      expect(await db.query(Filter.type(type)).run()).toHaveLength(0);
    }
    const layouts: Scene.Layout2D[] = await db.query(Filter.type(Scene.Layout2D)).run();
    const layout = layouts.find(({ id }) => id === ids.main);
    expect(layouts.map(({ id }) => id).sort()).toEqual([ids.parts, ids.main].sort());
    expect(layout?.model?.target?.id).toBe(ids.model);
    const [migrated]: Scene.Model2D[] = await db.query(Filter.type(Scene.Model2D)).run();
    expect(migrated.objects['instance:card'].parts?.target?.id).toBe(ids.parts);
    const [brand]: StyleCatalog[] = await db.query(Filter.type(StyleCatalog)).run();
    expect([brand.id, brand.styles]).toEqual([ids.catalog, { accent: { color: 'violet', stroke: 'dashed' } }]);
    if (!layout) {
      return;
    }

    const scene = Obj.make(Scene.Scene2D, {
      key: 'scene',
      layout: Ref.make(layout),
      camera: { center: { x: 0, y: 0 }, zoom: 1 },
    });
    const document = fromEcho(scene);
    const stored = document.layouts.find(({ id }) => id === 'main');
    expect(stored?.dim === '2d' && stored.elements).toEqual({
      a: {
        id: 'a',
        kind: 'rect',
        z: 'a0',
        ...frame,
        label: 'A',
        layer: 'base',
        style: 'warn',
        overrides: { color: 'red/1', corners: 'all', font: 'mono' },
        ports: [{ id: 'out', x: 1, y: 0.5, side: 'right' }],
      },
      card: {
        id: 'card',
        object: 'instance:card',
        kind: 'instance',
        z: 'a1',
        center: { x: 200, y: 0 },
        size: { width: 96, height: 48 },
        layer: 'base',
        composite: 'card',
        partOverrides: { title: { label: 'Mine' } },
      },
      link: {
        id: 'link',
        kind: 'link',
        path: 'ortho',
        z: 'a2',
        layer: 'base',
        source: { node: 'a', port: 'out' },
        target: { node: 'card' },
        label: 'uses',
        head: 'crowsfoot',
      },
    });
    expect(stored?.dim === '2d' && stored.constraints).toEqual([
      { subject: 'card', relation: 'right-of', object: 'a' },
    ]);
    expect(document.models[0]).toMatchObject({
      styles: { warn: { name: 'Warn', color: 'amber/3', stroke: 'none' } },
      objects: { 'instance:card': { id: 'instance:card', kind: 'rect', parts: 'card' } },
    });

    // The editor's list of the migrated drawing: a node, an instance of the card with its own title, and the link.
    const list = stored?.dim === '2d' ? toRenderList2D(document, stored) : undefined;
    expect(list?.nodes.a).toMatchObject({ kind: 'rect', style: 'warn', overrides: { color: 'red/1' } });
    expect(list?.nodes.card).toMatchObject({
      kind: 'instance',
      composite: 'card',
      partOverrides: { title: { label: 'Mine' } },
    });
    expect(list?.links.link).toMatchObject({ kind: 'link', path: 'ortho', head: 'crowsfoot', label: 'uses' });
    const card = document.layouts.find(({ id }) => id === 'card');
    expect(card?.dim === '2d' && toRenderList2D(document, card).nodes.title).toMatchObject({
      kind: 'note',
      label: 'Title',
    });
  });

  test('running the migrations again changes nothing', async ({ expect }) => {
    const db = await setup();
    db.add(Obj.make(Legacy.Layout2D, { key: 'main', elements: { a: { id: 'a', type: 'rect', z: 'a0', ...frame } } }));
    await db.flush();
    await db.runMigrations([...Legacy.Migrations]);
    const [before]: Scene.Layout2D[] = await db.query(Filter.type(Scene.Layout2D)).run();
    const elements = JSON.stringify(before.elements);
    await db.runMigrations([...Legacy.Migrations]);
    const after: Scene.Layout2D[] = await db.query(Filter.type(Scene.Layout2D)).run();
    expect(after).toHaveLength(1);
    expect(JSON.stringify(after[0].elements)).toBe(elements);
  });
});
