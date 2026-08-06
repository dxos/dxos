//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import type * as GenerationService from '@dxos/plugin-studio/GenerationService';
import * as StudioCapabilities from '@dxos/plugin-studio/StudioCapabilities';

import { heyGenFieldMap } from '#components';
import { makeHeyGenGenerationService } from '#services';

export default Capability.makeModule(() => {
  // Explicit type keeps the emitted declaration portable (TS2883). The provider customizes the
  // avatar/voice fields (populated pickers) via fieldMap; studio renders the rest from the schema.
  const service: GenerationService.GenerationService = { ...makeHeyGenGenerationService(), fieldMap: heyGenFieldMap };
  return Effect.succeed(Capability.contribute(StudioCapabilities.GenerationService, service));
});
