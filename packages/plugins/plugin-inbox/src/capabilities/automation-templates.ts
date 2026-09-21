//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';
import * as RoutineEvents from '@dxos/plugin-routine/RoutineEvents';

import { analyzeMailbox } from '../templates/analyze-mailbox.ts';

export const AutomationTemplates = Capability.makeModule(
  'AutomationTemplates',
  { provides: [RoutineCapabilities.Template], activatesOn: RoutineEvents.Start },
  Effect.fnUntraced(function* () {
    return [Capability.contribute(RoutineCapabilities.Template, analyzeMailbox)];
  }),
);
