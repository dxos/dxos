//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { routineTemplates } from '../templates/index.ts';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return routineTemplates.map((template) => Capability.contribute(RoutineCapabilities.Template, template));
  }),
);
