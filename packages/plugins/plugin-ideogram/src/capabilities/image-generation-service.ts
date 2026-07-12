//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { IllustratorCapabilities, type ImageGeneration } from '@dxos/plugin-illustrator/types';

import { makeIdeogramImageGenerationService } from '#services';

export default Capability.makeModule(() => {
  // Explicit type keeps the emitted declaration portable (TS2883).
  const service: ImageGeneration.ImageGenerationService = makeIdeogramImageGenerationService();
  return Effect.succeed(Capability.contributes(IllustratorCapabilities.ImageGenerationService, service));
});
