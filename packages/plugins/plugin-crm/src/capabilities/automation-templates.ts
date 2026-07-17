//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { RoutineCapabilities } from '@dxos/plugin-routine';

import { crm } from '../templates/crm';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.provide(RoutineCapabilities.Template, crm)];
  }),
);
