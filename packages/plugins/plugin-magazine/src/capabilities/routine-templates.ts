//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { magazineCuration } from '../templates/magazine-curation.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contribute(RoutineCapabilities.Template, magazineCuration);
  }),
);
