//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import type * as GenerationService from '@dxos/plugin-studio/GenerationService';
import * as StudioCapabilities from '@dxos/plugin-studio/StudioCapabilities';

import { makeHiggsfieldImageService, makeHiggsfieldProvider, makeHiggsfieldVideoService } from '#services';

export default Capability.makeModule(() => {
  // One proxy-wired provider backs both kinds; the explicit type keeps the emitted declaration
  // portable (TS2883).
  const provider = makeHiggsfieldProvider();
  const services: GenerationService.GenerationService[] = [
    makeHiggsfieldImageService(provider),
    makeHiggsfieldVideoService(provider),
  ];
  return Effect.succeed(Capability.contributeAll(StudioCapabilities.GenerationService, services));
});
