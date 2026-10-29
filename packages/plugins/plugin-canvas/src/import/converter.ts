//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { type ContentMap } from '@dxos/diagram';
import { Database } from '@dxos/echo';
import * as Drawing from '@dxos/plugin-illustrator/Drawing';
import type * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorError from '@dxos/plugin-illustrator/IllustratorError';
import * as IllustratorModel from '@dxos/plugin-illustrator/IllustratorModel';

import { Canvas } from '#types';

import { readCanvasContent, writeCanvasContent } from '../model/canvas-content.ts';
import { clone, rootOf, seedContent, writeViews } from '../model/content.ts';
import { DrawingDialectError } from '../operations/canvas.ts';
import { tldrawToViews } from './tldraw.ts';

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
            // A canvas variant with its own type writes the shapes into the layout its new canvas opens.
            if (variants.to.canvasType !== undefined) {
              const canvas = yield* variants.to.createCanvas();
              if (!Canvas.isCanvas(canvas)) {
                return { canvas, upserted: [] };
              }
              const before = readCanvasContent(canvas);
              const content = clone(before);
              const { views } = tldrawToViews(source.content, { root: rootOf(content) ?? seedContent(content) });
              writeViews(content, views);
              writeCanvasContent(canvas, content, before);
              return { canvas, upserted: Object.values(views).flatMap((view) => Object.keys(view.nodes)) };
            }
            const content: ContentMap = {};
            const root = seedContent(content);
            const { views } = tldrawToViews(source.content, { root });
            writeViews(content, views);
            const upserted = Object.values(views).flatMap((view) => Object.keys(view.nodes));
            const canvas = yield* Database.add(Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content }));
            return { canvas, upserted };
          }),
      ),
    ),
};
