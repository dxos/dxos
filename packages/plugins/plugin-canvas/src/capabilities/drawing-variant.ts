//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';

import { CanvasArticle, CanvasCard, LegacyCanvasArticle, LegacyCanvasCard } from '#containers';
import { CanvasBuilder, CanvasLayoutBuilder, addCanvas } from '#model';
import { Canvas } from '#types';

// New drawings are a `Canvas` over a model, layouts and scenes; a conversion asks for `diagramShapes`, so a laid-out
// diagram keeps the look its renderer gave it.
const variant: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.SCENE_SCHEMA,
  label: 'Canvas',
  icon: 'ph--graph--regular',
  canvasType: Canvas.Canvas,
  createCanvas: (input) => addCanvas(input?.diagramShapes === true ? { diagramShapes: true } : {}),
  builder: CanvasLayoutBuilder,
  card: CanvasCard,
  article: CanvasArticle,
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
    Capability.contribute(IllustratorCapabilities.VariantProvider, legacy),
  ]),
);
