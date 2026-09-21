//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';

import { magazineCuration } from '../templates/magazine-curation.ts';

export const RoutineTemplates = Capability.makeModule(
  'RoutineTemplates',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  Effect.fnUntraced(function* () {
    return Capability.contribute(RoutineCapabilities.Template, magazineCuration);
  }),
);
