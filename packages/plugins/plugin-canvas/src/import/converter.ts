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

import { seedContent, writeViews } from '../model/content.ts';
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
            const content: ContentMap = {};
            const root = seedContent(content);
            const { views } = tldrawToViews(source.content, { root });
            writeViews(content, views);
            const canvas = yield* Database.add(Drawing.makeCanvas({ schema: Canvas.SCENE_SCHEMA, content }));
            return { canvas, upserted: Object.values(views).flatMap((view) => Object.keys(view.nodes)) };
          }),
      ),
    ),
};
