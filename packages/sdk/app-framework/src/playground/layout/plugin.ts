//
// Copyright 2025 DXOS.org
//

import * as Common from '../../common';
import { Capability, Plugin } from '../../core';

const Layout = Capability.lazy('Layout', () => import('./Layout'));

const meta = { id: 'dxos.org/test/layout', name: 'Layout' };

export const LayoutPlugin = Plugin.define(meta).pipe(
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.Startup,
    activate: Layout,
  }),
  Plugin.make,
);
