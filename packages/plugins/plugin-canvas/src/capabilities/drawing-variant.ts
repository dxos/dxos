//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';

import { CanvasArticle } from '#containers';
import { CanvasBuilder, createCanvas } from '#model';
import { Canvas } from '#types';

// The base `Drawing.Canvas` holds the scene records, discriminated by `schema`; the canvas is created
// here so a new drawing starts with its root scene.
const variant: IllustratorCapabilities.DrawingVariant = {
  id: Canvas.SCENE_SCHEMA,
  label: 'Canvas',
  icon: 'ph--graph--regular',
  createCanvas: () => Effect.succeed(createCanvas()),
  builder: CanvasBuilder,
  article: CanvasArticle,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(IllustratorCapabilities.VariantProvider, variant)),
);
