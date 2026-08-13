//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import * as RoutineCapabilities from '@dxos/plugin-routine/RoutineCapabilities';

import { enrichMailbox } from '../templates/enrich-mailbox';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    return [Capability.contribute(RoutineCapabilities.Template, enrichMailbox)];
  }),
);
