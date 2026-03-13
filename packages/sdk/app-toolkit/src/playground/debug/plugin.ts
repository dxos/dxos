//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';

const Debug = Capability.lazy('Debug', () => import('./Debug'));

export const DebugPlugin = Plugin.define({ id: 'org.dxos.test.plugin-debug', name: 'Debug' }).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: Debug,
  }),
  Plugin.make,
);
