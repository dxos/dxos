//
// Copyright 2025 DXOS.org
//

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

const Layout = Capability.lazyModule('Layout', { provides: [Capabilities.ReactRoot] }, () => import('./Layout'));

const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.layout'), name: 'Layout' });

export const LayoutPlugin = Plugin.define(meta).pipe(Plugin.addModule(Layout), Plugin.make);
