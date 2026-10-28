//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';

import { spacetimeStage } from '../containers/SpacetimeStage/index.ts';

export default Capability.makeModule(() =>
  Effect.succeed(Capability.contribute(AnimatorCapabilities.Stage, spacetimeStage)),
);
