//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type DrawingVariant, IllustratorCapabilities } from '@dxos/plugin-illustrator/types';

import { ExcalidrawArticle } from '#containers';
import { ExcalidrawBuilder } from '#model';

import { Excalidraw } from '../types';

// No `canvasType`/`createCanvas`: excalidraw stores its elements in the base `Drawing.Canvas`,
// discriminated by `schema`.
const variant: DrawingVariant = {
  id: Excalidraw.EXCALIDRAW_SCHEMA,
  label: 'Excalidraw',
  icon: 'ph--compass-tool--regular',
  builder: ExcalidrawBuilder,
  article: ExcalidrawArticle,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contributes(IllustratorCapabilities.VariantProvider, variant)),
);
