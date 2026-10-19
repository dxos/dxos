//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';

import * as Capability from '@dxos/app-framework/Capability';
import { isTauri } from '@dxos/util';

import { createBrowserBridge, createTauriBridge } from '#bridge';
import { MeetingRecorderCapabilities } from '#types';

export default Capability.makeModule(() =>
  Effect.sync(() =>
    Capability.contribute(MeetingRecorderCapabilities.Bridge, isTauri() ? createTauriBridge() : createBrowserBridge()),
  ),
);
