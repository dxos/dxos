//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

const Debug = Capability.lazyModule('Debug', { provides: [Capabilities.ReactSurface] }, () => import('./Debug'));

export const DebugPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.test.pluginDebug'), name: 'Debug' }),
).pipe(Plugin.addModule(Debug), Plugin.make);
