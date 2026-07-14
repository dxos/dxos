//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type GenerationService, StudioCapabilities } from '@dxos/plugin-studio/types';

import { makeHeyGenGenerationService } from '#services';

export default Capability.makeModule(() => {
  // Explicit type keeps the emitted declaration portable (TS2883).
  const service: GenerationService.GenerationService = makeHeyGenGenerationService();
  return Effect.succeed(Capability.contributes(StudioCapabilities.GenerationService, service));
});
