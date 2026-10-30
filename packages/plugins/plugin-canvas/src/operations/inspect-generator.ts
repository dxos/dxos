//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Operation from '@dxos/compute/Operation';
import { Database, type Ref } from '@dxos/echo';
import type * as Drawing from '@dxos/plugin-illustrator/Drawing';
import { type View, checkGenerator } from '@dxos/react-ui-canvas/headless';
import { toCanvasView } from '@dxos/react-ui-scene/canvas';
import { type GeneratorNode } from '@dxos/scene';

import { Canvas, CanvasOperation, Generator } from '#types';

import { canvasDocument } from '../model/canvas-document.ts';
import { generatorCompiler } from '../model/compiler.ts';
import { readStyles } from '../model/content.ts';
import { legacyDocument } from '../model/migrate-scenes.ts';
import { isSceneCanvas } from '../model/view-node.ts';
import { DrawingDialectError } from './canvas.ts';

const handler: Operation.WithHandler<typeof CanvasOperation.InspectGenerator> = CanvasOperation.InspectGenerator.pipe(
  Operation.withHandler(
    Effect.fn(function* ({ generator: ref, drawing: drawingRef, node, params, bounds, times }) {
      const generator = yield* Database.load(ref);
      const placed = drawingRef && node ? yield* sceneOf(drawingRef, node) : undefined;
      const scene = placed ?? standalone(Generator.referenceOf(generator), params, bounds);
      const report = yield* Effect.promise(() =>
        checkGenerator({
          compile: generatorCompiler,
          source: generator.source,
          schema: generator.params,
          scene,
          node: placed && node ? node : STANDALONE_NODE,
          times: times ?? DEFAULT_TIMES,
        }),
      );
      return {
        ...(report.errors ? { errors: report.errors } : {}),
        ...(report.status
          ? { status: report.status.state === 'paused' ? `paused: ${report.status.message}` : 'running' }
          : {}),
        ...(report.timing ? { meanStepMs: report.timing.meanMs, budgetMs: report.timing.budgetMs } : {}),
        ...(report.deterministic !== undefined ? { deterministic: report.deterministic } : {}),
        ...(report.mismatch !== undefined ? { mismatch: report.mismatch } : {}),
        ...(report.frames ? { frames: report.frames } : {}),
        ...(report.sheet ? { sheet: report.sheet } : {}),
      };
    }),
  ),
);

export default handler;

const DEFAULT_TIMES = [0, 0.5, 1, 1.5, 2, 2.5, 3];
const STANDALONE_NODE = 'generator';

/**
 * The View of the drawing that holds `node`: a scene canvas's 2D layout read as one; a legacy scene canvas is read as the
 * scene migration reads it, without writing it, since an inspection changes nothing.
 */
const sceneOf = Effect.fn(function* (drawingRef: Ref.Ref<Drawing.Drawing>, node: string) {
  const drawing = yield* Database.load(drawingRef);
  const canvas = yield* Database.load(drawing.canvas);
  const document = Canvas.isCanvas(canvas)
    ? canvasDocument(canvas)
    : isSceneCanvas(canvas)
      ? legacyDocument(canvas.content, readStyles(canvas.styles))
      : undefined;
  if (!document) {
    return yield* Effect.fail(new DrawingDialectError({ message: 'The drawing is not a scene canvas.' }));
  }
  return document.layouts
    .flatMap((layout) => (layout.dim === '2d' ? [toCanvasView(document, layout)] : []))
    .find((scene) => scene.nodes[node] !== undefined);
});

/** A scene holding only the generator, for a check before it is placed. */
const standalone = (
  reference: string,
  params: Record<string, unknown> | undefined,
  bounds: { x: number; y: number; width: number; height: number } = { x: -256, y: -256, width: 512, height: 512 },
): View => {
  const node: GeneratorNode = {
    type: 'generator',
    id: STANDALONE_NODE,
    z: 'a0',
    center: { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 },
    size: { width: bounds.width, height: bounds.height },
    generator: reference,
    params: params ?? {},
  };
  return { id: 'check', nodes: { [node.id]: node }, links: {} };
};
