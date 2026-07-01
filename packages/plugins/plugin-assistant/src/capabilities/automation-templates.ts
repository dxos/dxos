//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { RoutineCapabilities } from '@dxos/plugin-routine';

import { routineTemplates } from '../templates';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return routineTemplates.map((template) => Capability.contributes(RoutineCapabilities.Template, template));
  }),
);
