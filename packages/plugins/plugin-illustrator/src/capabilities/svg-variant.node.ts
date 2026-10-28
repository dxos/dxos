//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { SVG_SCHEMA } from '@dxos/diagram';

import { SvgBuilder } from '#model';
import { IllustratorCapabilities } from '#types';

const variant: IllustratorCapabilities.DrawingVariant = {
  id: SVG_SCHEMA,
  label: 'svg',
  icon: 'ph--vector-two--regular',
  builder: SvgBuilder,
};

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(IllustratorCapabilities.VariantProvider, variant)),
);
