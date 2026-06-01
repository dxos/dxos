//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

const Debug = Capability.lazy('Debug', () => import('./Debug'));

export const DebugPlugin = Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.test.pluginDebug'), name: 'Debug' })).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: Debug,
  }),
  Plugin.make,
);
