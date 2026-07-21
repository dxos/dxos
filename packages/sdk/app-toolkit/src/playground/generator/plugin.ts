//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

const Main = Capability.lazyModule('Main', { provides: [Capabilities.ReactSurface] }, () => import('./Main'));
const Toolbar = Capability.lazyModule('Toolbar', { provides: [Capabilities.ReactSurface] }, () => import('./Toolbar'));

export const GeneratorPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.test.generator'), name: 'Generator' }),
).pipe(Plugin.addModule(Main), Plugin.addModule(Toolbar), Plugin.make);
