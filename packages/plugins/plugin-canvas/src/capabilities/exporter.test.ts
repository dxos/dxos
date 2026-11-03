//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import * as Registry from 'effect/reactivity/AtomRegistry';
import { afterEach, beforeEach, describe, expect, test } from 'vitest';

import * as Capability from '@dxos/app-framework/Capability';
import * as CapabilityManager from '@dxos/app-framework/CapabilityManager';
import { MermaidEngine } from '@dxos/diagram';
import { Database, type Obj } from '@dxos/echo';
import { type EchoDatabase } from '@dxos/echo-client';
import { EchoTestBuilder } from '@dxos/echo-client/testing';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import {
  DEFAULT_LATTICE,
  cellBounds,
  createLink,
  createNode,
  defaultNodeRegistry,
  flattenPath,
  viewLinkGeometry,
} from '@dxos/react-ui-canvas';
import { fromEcho } from '@dxos/scene';

import {
  CanvasLayoutBuilder,
  addCanvas,
  canvasRecordOf,
  editCanvasContent,
  linkKey,
  nodeKey,
  openScene,
  readCanvasContent,
  readViews,
  setLayoutLattice,
} from '#model';

import { exporter } from './exporter.ts';
import types from './schema.ts';

type Point = { x: number; y: number };

type Size = { width: number; height: number };

type ContentEdit = Parameters<typeof editCanvasContent>[1];

describe('canvas exporter', () => {
  let builder: EchoTestBuilder;
  let db: EchoDatabase;

  beforeEach(async () => {
    builder = await new EchoTestBuilder().open();
    ({ db } = await builder.createDatabase({ types: [Drawing.Drawing, Drawing.Canvas, ...types] }));
  });

  afterEach(async () => {
    await builder.close();
  });

  const run = <A>(effect: Effect.Effect<A, Error, Database.Service | Capability.Service>) =>
    EffectEx.runPromise(
      effect.pipe(
        Effect.provideService(Capability.Service, CapabilityManager.make({ registry: Registry.make() })),
        Effect.provide(Database.layer(db)),
      ),
    );

  const drawingOf = (canvas: Obj.Unknown) => db.add(Drawing.make({ name: 'Flow', canvas }));

  const available = (drawing: Drawing.Drawing) =>
    Registry.make().get(Atom.make((get) => exporter.available?.(drawing, get)));

  const save = (drawing: Drawing.Drawing) =>
    EffectEx.runPromise(exporter.save?.(drawing) ?? Effect.die('The exporter does not save.'));

  const print = (drawing: Drawing.Drawing) =>
    EffectEx.runPromise(exporter.print?.(drawing) ?? Effect.die('The exporter does not print.'));

  test('a 2D canvas saves as an SVG file and prints the same markup', async () => {
    const canvas = await run(addCanvas());
    CanvasLayoutBuilder.apply(canvas, await MermaidEngine.compile('flowchart LR\n  A[Client] --> B[Server]'));
    const drawing = drawingOf(canvas);
    expect(available(drawing)).toBe(true);

    const file = await save(drawing);
    expect(file.extension).toBe('svg');
    expect(file.mimeType).toBe('image/svg+xml;charset=utf-8');
    expect(file.content).toContain('<svg');
    expect(file.content).toContain('Client');
    expect(await print(drawing)).toBe(file.content);
  });

  test('shapes drawn by hand are exported, while a child view is not', async () => {
    const canvas = await run(addCanvas());
    const root = canvasRecordOf(readCanvasContent(canvas))?.root ?? '';
    const shape = (id: string, x: number, scene: string, label: string) => ({
      kind: 'node' as const,
      scene,
      node: { ...createNode({ type: 'rect', id, z: 'a0', center: { x, y: 0 }, scene }), label },
    });
    editCanvasContent(canvas, (content) => {
      content[nodeKey('left')] = shape('left', 0, root, 'Drawn by hand');
      content[nodeKey('child')] = shape('child', 400, 'elsewhere', 'In a child view');
    });

    const { content } = await save(drawingOf(canvas));
    expect(content).toContain('Drawn by hand');
    expect(content).not.toContain('In a child view');
  });

  const linked =
    (root: string, centers: { from: Point; to: Point }, size?: Size): ContentEdit =>
    (content) => {
      const node = (id: string, center: Point) => ({
        kind: 'node' as const,
        scene: root,
        node: createNode({ type: 'rect', id, z: 'a0', center, scene: root, ...(size ? { size } : {}) }),
      });
      content[nodeKey('from')] = node('from', centers.from);
      content[nodeKey('to')] = node('to', centers.to);
      content[linkKey('link')] = {
        kind: 'link',
        scene: root,
        link: createLink({
          type: 'smart',
          id: 'link',
          z: 'a1',
          source: { node: 'from' },
          target: { node: 'to' },
          ends: { end: 'arrow' },
        }),
      };
    };

  const routeInSvg = (route: readonly Point[]) =>
    `points="${route
      .slice(0, -1)
      .map(({ x, y }) => `${x},${y}`)
      .join(' ')}"`;

  test('a link follows the route the canvas draws it along, not one of its own', async () => {
    const canvas = await run(addCanvas());
    const root = canvasRecordOf(readCanvasContent(canvas))?.root ?? '';
    editCanvasContent(canvas, linked(root, { from: { x: 0, y: 0 }, to: { x: 480, y: 320 } }));

    const view = readViews(readCanvasContent(canvas))[root];
    const [geometry] = viewLinkGeometry(view, defaultNodeRegistry, [view.links.link]);
    const route = flattenPath(geometry.path).flat();
    expect(route.length).toBeGreaterThan(2);

    const { content } = await save(drawingOf(canvas));
    expect(content).toContain(routeInSvg(route));
    expect(content).toContain('marker-end');
  });

  test('on a lattice a link takes the gutters, as it does on screen', async () => {
    const canvas = await run(addCanvas());
    setLayoutLattice(canvas, true);
    const root = canvasRecordOf(readCanvasContent(canvas))?.root ?? '';
    const center = (col: number, row: number) => {
      const { x, y, width, height } = cellBounds({ col, row, spanX: 1, spanY: 1 }, DEFAULT_LATTICE);
      return { x: x + width / 2, y: y + height / 2 };
    };
    const size = { width: DEFAULT_LATTICE.width, height: DEFAULT_LATTICE.height };
    editCanvasContent(canvas, linked(root, { from: center(0, 0), to: center(2, 2) }, size));

    const scene = openScene(canvas);
    const layout = scene && fromEcho(scene).layouts.find(({ id }) => id === root);
    const lattice = layout?.dim === '2d' ? layout.lattice : undefined;
    expect(lattice).toBeDefined();

    const view = readViews(readCanvasContent(canvas))[root];
    const links = [view.links.link];
    const [routed] = viewLinkGeometry(view, defaultNodeRegistry, links, lattice);
    const [free] = viewLinkGeometry(view, defaultNodeRegistry, links);
    expect(routed.path).not.toEqual(free.path);

    const { content } = await save(drawingOf(canvas));
    expect(content).toContain(routeInSvg(flattenPath(routed.path).flat()));
  });

  test('a 3D canvas offers no export and refuses one', async () => {
    const drawing = drawingOf(await run(addCanvas({ dimension: '3d' })));
    expect(available(drawing)).toBe(false);
    await expect(save(drawing)).rejects.toThrow('Only 2D canvases');
  });

  test('a drawing in another format offers no export and refuses one', async () => {
    const drawing = drawingOf(db.add(Drawing.makeCanvas({ schema: 'tldraw' })));
    expect(available(drawing)).toBe(false);
    await expect(print(drawing)).rejects.toThrow('Only canvas drawings');
  });
});
