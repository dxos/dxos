//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { SVG_SCHEMA } from '@dxos/diagram';

import { SvgArticle } from '#containers';
import { SvgBuilder } from '#model';
import { IllustratorCapabilities } from '#types';
import { IllustratorEvents } from '#types';

// The scene DSL is stored verbatim in the base `Drawing.Canvas` (no renderer-native encoding),
// so the variant lives in plugin-illustrator itself rather than a renderer plugin.
const variant: IllustratorCapabilities.DrawingVariant = {
  id: SVG_SCHEMA,
  label: 'svg',
  icon: 'ph--vector-two--regular',
  builder: SvgBuilder,
  card: SvgArticle,
  article: SvgArticle,
};

// Browser-only: the variant supplies the React article/card components that render a drawing.
export const SvgVariant = Capability.makeModule(
  'IllustratorSvgVariant',
  { provides: [IllustratorCapabilities.VariantProvider], activatesOn: IllustratorEvents.Start, environments: [] },
  () => Effect.succeed(Capability.contribute(IllustratorCapabilities.VariantProvider, variant)),
);
