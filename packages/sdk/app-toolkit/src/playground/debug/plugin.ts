//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

const Debug = Capability.lazyModule('Debug', { provides: [Capabilities.ReactSurface] }, () => import('./Debug'));

export const DebugPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.test.pluginDebug'), name: 'Debug' }),
).pipe(Plugin.addModule(Debug), Plugin.make);
