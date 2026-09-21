//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';

import { RoutineCapabilities } from '#types';

import { defaultTemplates } from '../templates/index.ts';

export const Templates = Capability.makeModule(
  'Templates',
  { provides: [RoutineCapabilities.Template], environments: ['node', 'workerd'] },
  Effect.fnUntraced(function* () {
    return Capability.contributeAll(RoutineCapabilities.Template, defaultTemplates);
  }),
);
