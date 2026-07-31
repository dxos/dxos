//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { type GenerationService, StudioCapabilities } from '@dxos/plugin-studio/types';

import { makeIdeogramGenerationService } from '#services';

export default Capability.makeModule(() => {
  // Explicit type keeps the emitted declaration portable (TS2883).
  const service: GenerationService.GenerationService = makeIdeogramGenerationService();
  return Effect.succeed(Capability.contribute(StudioCapabilities.GenerationService, service));
});
