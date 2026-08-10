//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { defaultTemplates } from '../templates';
import * as RoutineCapabilities from '../types/RoutineCapabilities';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(RoutineCapabilities.Template, defaultTemplates);
  }),
);
