//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';

const Layout = Capability.lazy('Layout', () => import('./Layout'));

const meta = { id: 'org.dxos.test.layout', name: 'Layout' };

export const LayoutPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: Layout,
  }),
  Plugin.make,
);
