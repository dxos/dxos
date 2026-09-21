//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';

import { routineTemplates } from '../templates/index.ts';

export const AutomationTemplates = Capability.makeModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  Effect.fnUntraced(function* () {
    return routineTemplates.map((template) => Capability.contribute(RoutineCapabilities.Template, template));
  }),
);
