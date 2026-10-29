//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';

import { CanvasArticle, CanvasCard, LegacyCanvasArticle, LegacyCanvasCard } from '#containers';
import { CanvasBuilder, CanvasLayoutBuilder, addCanvas, canvasDimension, removeCanvas } from '#model';
import { Canvas } from '#types';

// New drawings are a `Canvas` over a model, layouts and scenes; a conversion asks for `diagramShapes`, so a laid-out
// diagram keeps the look its renderer gave it.
const variant: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.SCENE_SCHEMA,
  label: 'Canvas',
  icon: 'ph--graph--regular',
  canvasType: Canvas.Canvas,
  createCanvas: (input) => addCanvas(input?.diagramShapes === true ? { diagramShapes: true } : {}),
  removeCanvas: (canvas) =>
    Effect.sync(() => {
      Canvas.isCanvas(canvas) && removeCanvas(canvas);
    }),
  // Copying reads the open 2D layout; a 3D canvas has none, so it offers no copies rather than an empty one.
  convertible: (canvas) => !Canvas.isCanvas(canvas) || canvasDimension(canvas) !== '3d',
  builder: CanvasLayoutBuilder,
  card: CanvasCard,
  article: CanvasArticle,
};

// A 3D canvas is the same `Canvas` type over a Scene3D: picking it only changes what is created, so it shares the
// 2D variant's surfaces, which open the editor its scene's dimension asks for.
const variant3d: IllustratorCapabilities.DrawingVariant = {
  ...variant,
  id: `${Canvas.SCENE_SCHEMA}#3d`,
  label: '3D Canvas',
  icon: 'ph--cube--regular',
  createOnly: true,
  createCanvas: () => addCanvas({ dimension: '3d' }),
};

// Scene drawings saved before `Canvas` keep their base `Drawing.Canvas` until their article migrates them.
const legacy: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.SCENE_SCHEMA,
  label: 'Canvas',
  icon: 'ph--graph--regular',
  hidden: true,
  builder: CanvasBuilder,
  card: LegacyCanvasCard,
  article: LegacyCanvasArticle,
};

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(IllustratorCapabilities.VariantProvider, variant),
    Capability.contribute(IllustratorCapabilities.VariantProvider, variant3d),
    Capability.contribute(IllustratorCapabilities.VariantProvider, legacy),
  ]),
);
