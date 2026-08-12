//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { makeSyncTemplate } from '../templates';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const capabilities = yield* Capability.Service;
    return Capability.contribute(RoutineCapabilities.Template, makeSyncTemplate(capabilities));
  }),
);
