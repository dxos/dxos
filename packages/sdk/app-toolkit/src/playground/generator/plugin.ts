//
// Copyright 2025 DXOS.org
//

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import { DXN } from '@dxos/keys';

const Main = Capability.makeLazyModule('Main', { provides: [Capabilities.ReactSurface] }, () => import('./Main.tsx'));
const Toolbar = Capability.makeLazyModule(
  'Toolbar',
  { provides: [Capabilities.ReactSurface] },
  () => import('./Toolbar.tsx'),
);

export const GeneratorPlugin = Plugin.define(
  Plugin.makeMeta({ key: DXN.make('org.dxos.test.generator'), name: 'Generator' }),
).pipe(Plugin.addModule(Main), Plugin.addModule(Toolbar), Plugin.make);
