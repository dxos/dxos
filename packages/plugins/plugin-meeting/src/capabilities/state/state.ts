//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability } from '@dxos/app-framework';
import { live } from '@dxos/live-object';

import { MeetingCapabilities } from '../../types';

export default Capability.makeModule(() =>
  Effect.sync(() => {
    const state = live<MeetingCapabilities.State>({});
    return Capability.contributes(MeetingCapabilities.State, state);
  }),
);
