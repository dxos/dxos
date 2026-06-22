//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { RoutineCapabilities } from '@dxos/plugin-routine';

import { automationTemplates } from '../templates';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return automationTemplates.map((template) => Capability.contributes(RoutineCapabilities.Template, template));
  }),
);
