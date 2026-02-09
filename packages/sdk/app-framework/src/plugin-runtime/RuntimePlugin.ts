//
// Copyright 2025 DXOS.org
//

import * as Common from '../common';
import { Capability, Plugin } from '../core';

import { meta } from './meta';

const ManagedRuntimeCapability = Capability.lazy('ManagedRuntime', () => import('./capability'));

export const RuntimePlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activatesBefore: [Common.ActivationEvent.SetupLayer],
    activatesAfter: [Common.ActivationEvent.ManagedRuntimeReady],
    activate: ManagedRuntimeCapability,
  }),
  Plugin.make,
);
