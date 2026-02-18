//
// Copyright 2025 DXOS.org
//

import { ActivationEvents } from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';

const ManagedRuntimeCapability = Capability.lazy('ManagedRuntime', () => import('./capability'));

export const RuntimePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activatesBefore: [ActivationEvents.SetupLayer],
    activatesAfter: [ActivationEvents.ManagedRuntimeReady],
    activate: ManagedRuntimeCapability,
  }),
  Plugin.make,
);
