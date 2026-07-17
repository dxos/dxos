//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';

import { RoutineCapabilities } from '#types';

import { defaultTemplates } from '../templates';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.provideAll(RoutineCapabilities.Template, defaultTemplates)];
  }),
);
