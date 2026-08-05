//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { type GenerationService, StudioCapabilities } from '@dxos/plugin-studio/types';

import { heyGenFieldMap } from '#components';
import { makeHeyGenGenerationService } from '#services';

export default Capability.makeModule(() => {
  // Explicit type keeps the emitted declaration portable (TS2883). The provider customizes the
  // avatar/voice fields (populated pickers) via fieldMap; studio renders the rest from the schema.
  const service: GenerationService.GenerationService = { ...makeHeyGenGenerationService(), fieldMap: heyGenFieldMap };
  return Effect.succeed(Capability.contribute(StudioCapabilities.GenerationService, service));
});
