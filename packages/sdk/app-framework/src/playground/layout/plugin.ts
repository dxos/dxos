//
// Copyright 2025 DXOS.org
//

import { Events } from '../../common';
import { defineModule, definePlugin, lazy } from '../../core';

const Layout = lazy(() => import('./Layout'));

const meta = { id: 'dxos.org/test/layout', name: 'Layout' };

export const LayoutPlugin = definePlugin(meta, () => [
  defineModule({
    id: 'dxos.org/test/layout/root',
    activatesOn: Events.Startup,
    activate: Layout,
  }),
]);
