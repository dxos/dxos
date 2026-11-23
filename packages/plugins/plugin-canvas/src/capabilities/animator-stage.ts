//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as AnimatorCapabilities from '@dxos/plugin-animator/AnimatorCapabilities';

import { canvasStage2D, canvasStage3D } from '#containers';

export default Capability.makeModule(() =>
  Effect.succeed([
    Capability.contribute(AnimatorCapabilities.Stage, canvasStage2D),
    Capability.contribute(AnimatorCapabilities.Stage, canvasStage3D),
  ]),
);
