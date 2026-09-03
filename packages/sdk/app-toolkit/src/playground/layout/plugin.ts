//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

const Layout = Capability.lazyModule('Layout', { provides: [Capabilities.ReactRoot] }, () => import('./Layout.tsx'));

const meta = Plugin.makeMeta({ key: DXN.make('org.dxos.test.layout'), name: 'Layout' });

export const LayoutPlugin = Plugin.define(meta).pipe(Plugin.addModule(Layout), Plugin.make);
