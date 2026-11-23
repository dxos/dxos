//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Obj } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorError from '@dxos/plugin-illustrator/IllustratorError';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';
import { Scene } from '@dxos/scene';

import { Canvas } from '#types';

import { addCanvas, canvasDocument, openScene } from '../model/canvas-document.ts';
import { applyLayoutIntent } from '../model/layout-source.ts';
import { writeDocument } from '../model/model-writer.ts';
import { plain } from '../model/records.ts';
import { DrawingDialectError } from '../operations/canvas.ts';
import { type TldrawImportOptions, tldrawToLayout } from './tldraw.ts';

/**
 * Writes a tldraw document into a canvas's open 2D layout: the composite layouts its groups place and the objects that
 * place them first, as structure, then the page's layers and its elements, as create intents. Returns the ids of the
 * shapes it placed; none when the canvas opens no 2D layout.
 */
export const importTldraw = (
  canvas: Canvas.Canvas,
  content: Readonly<Record<string, unknown>>,
  options: Omit<TldrawImportOptions, 'root'> = {},
): string[] => {
  const layout = openScene(canvas)?.layout.target;
  if (!Obj.instanceOf(Scene.Layout2D, layout)) {
    return [];
  }
  const imported = tldrawToLayout(content, { ...options, root: layout.key });
  if (imported.parts.length > 0 || imported.objects.length > 0) {
    const before = canvasDocument(canvas);
    const model = before.layouts.find((record) => record.id === layout.key)?.model;
    const placed = Object.fromEntries(imported.objects.map((object) => [object.id, object]));
    writeDocument(canvas, {
      ...before,
      layouts: [...before.layouts, ...imported.parts.map((part) => ({ ...part, ...(model ? { model } : {}) }))],
      models: before.models.map((record) =>
        record.id === model && record.dim === '2d' ? { ...record, objects: { ...record.objects, ...placed } } : record,
      ),
    });
  }
  const layers = imported.layout.layers;
  layers &&
    Obj.update(layout, (layout) => {
      layout.layers = { ...layout.layers, ...plain(layers) };
    });
  applyLayoutIntent(layout, { kind: 'batch', intents: imported.intents });
  return [imported.layout, ...imported.parts].flatMap((record) =>
    Object.values(record.elements).flatMap((element) => (element.type === 'link' ? [] : [element.id])),
  );
};

/**
 * tldraw to canvas, the hybrid way: a drawing the scene DSL manages converts as every variant does (`IllustratorModel.convertByScene`),
 * keeping its laid-out look; one with hand-drawn shapes, which the DSL cannot carry, is mapped shape by shape instead.
 */
export const tldrawConverter: IllustratorCapabilities.DrawingConverter = {
  from: Canvas.TLDRAW_SCHEMA,
  to: Canvas.SCENE_SCHEMA,
  convert: (source, variants) =>
    IllustratorModel.convertByScene(source, variants).pipe(
      Effect.catchIf(
        (error) => IllustratorError.UnmanagedShapes.is(error),
        () =>
          Effect.gen(function* () {
            if (!Drawing.isCanvas(source)) {
              return yield* Effect.fail(
                new DrawingDialectError({ message: 'The tldraw converter reads a tldraw canvas.' }),
              );
            }
            // A legacy scene canvas is read only through the scene migration, so an untyped target gets a `Canvas` too.
            const canvas =
              variants.to.canvasType !== undefined ? yield* variants.to.createCanvas() : yield* addCanvas();
            return { canvas, upserted: Canvas.isCanvas(canvas) ? importTldraw(canvas, source.content) : [] };
          }),
      ),
    ),
};
