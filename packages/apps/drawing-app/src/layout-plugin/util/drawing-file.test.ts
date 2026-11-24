//
// Copyright 2026 DXOS.org
//

import { describe, onTestFinished, test } from 'vitest';

import { Client } from '@dxos/client';
import { TestBuilder } from '@dxos/client/testing';
import { DSL, SVG_SCHEMA } from '@dxos/diagram';
import { Filter, Obj, Ref } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { invariant } from '@dxos/invariant';
import * as Canvas from '@dxos/plugin-canvas/Canvas';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';
import { Legacy, Scene } from '@dxos/scene';

import { addDxSvg, canvasDxSvg, fileName, toDxSvg } from './drawing-file.ts';

const SOURCE = `node Idea "Idea"
node Sketch "Sketch" right-of Idea
edge Idea -> Sketch "write .dx"
`;

const makeSvgDrawing = async (name: string) => {
  const { commands } = await EffectEx.runPromise(DSL.compile(SOURCE));
  return IllustratorModel.DrawingFile.makeDrawing({ name, commands });
};

/** A space of a client that knows the types the app registers: the drawing's, and the canvas plugin's current ones. */
const createSpace = async () => {
  const testBuilder = new TestBuilder();
  onTestFinished(() => testBuilder.destroy());
  const client = new Client({
    services: testBuilder.createLocalClientServices(),
    types: [Drawing.Drawing, Drawing.Canvas, Canvas.Canvas, Scene.Model2D, Scene.Layout2D, Scene.Scene2D],
  });
  await client.initialize();
  onTestFinished(() => client.destroy());
  await client.halo.createIdentity();
  const space = await client.spaces.create();
  return space.waitUntilReady();
};

const frame = { center: { x: 0, y: 0 }, size: { width: 96, height: 48 } };

/** A canvas diagram's `.dx.svg` as the app exported it while the stored scene types were at version 0.1.0. */
const makeLegacyDxSvg = () => {
  const model = Obj.make(Legacy.Model2D, {
    key: 'model',
    objects: {},
    styles: { warn: { name: 'Warn', hue: 'amber', tone: 3, border: false } },
  });
  const layout = Obj.make(Legacy.Layout2D, {
    key: 'main',
    model: Ref.make(model),
    elements: {
      a: {
        id: 'a',
        type: 'rect',
        z: 'a0',
        ...frame,
        label: 'A',
        style: 'warn',
        overrides: { hue: 'red', tone: 1, rounded: true },
        props: { canvas: { ports: [{ id: 'out', side: 'e', offset: 0.5 }] } },
      },
      b: { id: 'b', type: 'note', z: 'a1', ...frame, center: { x: 200, y: 0 }, props: { canvas: { text: 'B' } } },
      link: {
        id: 'link',
        type: 'link',
        z: 'a2',
        source: { node: 'a', port: 'out' },
        target: { node: 'b' },
        props: { canvas: { type: 'ortho', text: 'uses', ends: { end: 'many' } } },
      },
    },
  });
  // A scene's layout is typed as the current layout, which this one is not yet, so it is named by its address.
  const scene = Obj.make(Scene.Scene2D, {
    key: 'scene',
    layout: Ref.fromURI(Ref.make(layout).uri),
    camera: { center: { x: 0, y: 0 }, zoom: 1 },
  });
  const canvas = Obj.make(Canvas.Canvas, {
    settings: {},
    model: Ref.make(model),
    layouts: [Ref.make(layout)],
    scenes: [Ref.make(scene)],
  });
  const drawing = Drawing.make({ name: 'Plan', canvas });
  const objects = [model, layout, scene];
  const picture = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 48"></svg>';
  return {
    svg: canvasDxSvg({ drawing, canvas, objects, picture }),
    ids: [...objects, canvas, drawing].map(({ id }) => id),
  };
};

describe('drawing-file', () => {
  test('an export carries the scene as a laid-out drawing and as DSL that compiles', async ({ expect }) => {
    const { drawing, canvas } = await makeSvgDrawing('Plan');
    const svg = toDxSvg({ drawing, canvas, builder: IllustratorModel.SvgBuilder });
    expect(svg).toContain('<svg');

    const payload = await EffectEx.runPromise(IllustratorModel.DrawingFile.fromDxSvg(svg));
    const [exportedCanvas, exportedDrawing] = payload?.objects ?? [];
    expect(exportedCanvas).toMatchObject({ schema: SVG_SCHEMA });
    expect(exportedDrawing).toMatchObject({ name: 'Plan' });
    expect(payload?.root).toBe(exportedDrawing?.id);

    const { problems } = await EffectEx.runPromise(DSL.compile(payload?.source?.text ?? ''));
    expect(problems.filter(({ severity }) => severity === 'error')).toHaveLength(0);
  });

  test('a file exported before the stored scene types changed imports in the current words', async ({ expect }) => {
    const { svg, ids } = makeLegacyDxSvg();
    expect(svg).toContain('org.dxos.type.scene.layout2d:0.1.0');
    expect(svg).toContain('"props":{"canvas":{"ports":[{"id":"out","side":"e","offset":0.5}]}}');

    const space = await createSpace();
    const drawing = await EffectEx.runPromise(addDxSvg(space, svg));
    expect(drawing.name).toBe('Plan');
    expect(ids).not.toContain(drawing.id);

    // What the editor opens: the drawing's canvas, and the layout and model it names.
    const canvas = await drawing.canvas.load();
    invariant(Canvas.isCanvas(canvas), 'The imported drawing resolves its canvas.');
    const [layout] = await Ref.loadAll(canvas.layouts);
    invariant(Obj.instanceOf(Scene.Layout2D, layout), 'The imported layout is a current layout.');
    expect(ids).not.toContain(layout.id);
    expect({ ...layout.elements }).toEqual({
      a: {
        id: 'a',
        kind: 'rect',
        z: 'a0',
        ...frame,
        label: 'A',
        style: 'warn',
        overrides: { color: 'red/1', corners: 'all' },
        ports: [{ id: 'out', x: 1, y: 0.5, side: 'right' }],
      },
      b: { id: 'b', kind: 'note', z: 'a1', ...frame, center: { x: 200, y: 0 }, label: 'B' },
      link: {
        id: 'link',
        kind: 'link',
        path: 'ortho',
        z: 'a2',
        source: { node: 'a', port: 'out' },
        target: { node: 'b' },
        label: 'uses',
        head: 'crowsfoot',
      },
    });
    const model = await canvas.model?.load();
    invariant(Obj.instanceOf(Scene.Model2D, model), 'The imported model is a current model.');
    expect(layout.model?.target).toBe(model);
    expect({ ...model.styles }).toEqual({ warn: { name: 'Warn', color: 'amber/3', stroke: 'none' } });

    // The scene still views the layout, and nothing of the earlier types is left in the space.
    const [scene] = await Ref.loadAll(canvas.scenes);
    invariant(Obj.instanceOf(Scene.Scene2D, scene), 'The imported canvas resolves its scene.');
    expect(await scene.layout.load()).toBe(layout);
    for (const type of [Legacy.Layout2D, Legacy.Model2D]) {
      expect(await space.db.query(Filter.type(type)).run()).toHaveLength(0);
    }
  });

  test('the file name comes from the diagram name', ({ expect }) => {
    expect(fileName({ name: 'Service map' })).toBe('Service-map.dx.svg');
    expect(fileName({ name: '' })).toBe('Untitled.dx.svg');
  });
});
