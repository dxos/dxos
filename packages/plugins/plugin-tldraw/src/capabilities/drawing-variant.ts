//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as IllustratorCapabilities from '@dxos/plugin-illustrator/IllustratorCapabilities';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';

import { TldrawArticle, TldrawCard } from '#containers';
import { TldrawBuilder } from '#model';
import { Tldraw } from '#types';

// No `canvasType`/`createCanvas`: tldraw stores its records in the base `Drawing.Canvas`,
// discriminated by `schema`.
const variant: IllustratorCapabilities.DrawingVariant = {
  id: Tldraw.TLDRAW_SCHEMA,
  label: 'tldraw',
  icon: 'ph--compass-tool--regular',
  builder: TldrawBuilder,
  card: TldrawCard,
  article: TldrawArticle,
};

// Browser-only: the variant supplies the React article/card components that render a drawing.
export const DrawingVariant = Capability.makeModule(
  'drawing-variant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: IllustratorEvents.Start, environments: [] },
  () => Effect.succeed(Capability.contribute(IllustratorCapabilities.VariantProvider, variant)),
);
