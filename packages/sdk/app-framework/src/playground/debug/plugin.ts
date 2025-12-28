//
// Copyright 2025 DXOS.org
//

import { Events } from '../../common';
import { Capability, Plugin } from '../../core';

const Debug = Capability.lazy('Debug', () => import('./Debug'));

export const DebugPlugin = Plugin.define({ id: 'dxos.org/test/plugin-debug', name: 'Debug' }).pipe(
  Plugin.addModule({
    activatesOn: Events.Startup,
    activate: Debug,
  }),
  Plugin.make,
);
