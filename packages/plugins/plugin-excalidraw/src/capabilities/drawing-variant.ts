//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';

import { ExcalidrawArticle } from '#containers';
import { ExcalidrawBuilder } from '#model';
import { Excalidraw } from '#types';

// No `canvasType`/`createCanvas`: excalidraw stores its elements in the base `Drawing.Canvas`,
// discriminated by `schema`.
const variant: IllustratorCapabilities.DrawingVariant = {
  id: Excalidraw.EXCALIDRAW_SCHEMA,
  label: 'Excalidraw',
  icon: 'ph--compass-tool--regular',
  builder: ExcalidrawBuilder,
  article: ExcalidrawArticle,
};

// Browser-only: the variant supplies the React article/card components that render a drawing.
export const DrawingVariant = Capability.makeModule(
  'drawing-variant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: IllustratorEvents.Start, environments: [] },
  () => Effect.succeed(Capability.contribute(IllustratorCapabilities.VariantProvider, variant)),
);
