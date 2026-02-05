//
// Copyright 2025 DXOS.org
//

import * as Common from '../../common';
import { Capability, Plugin } from '../../core';

const Debug = Capability.lazy('Debug', () => import('./Debug'));

export const DebugPlugin = Plugin.define({ id: 'dxos.org/test/plugin-debug', name: 'Debug' }).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: Debug,
  }),
  Plugin.make,
);
