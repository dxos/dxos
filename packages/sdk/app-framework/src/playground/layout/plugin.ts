//
// Copyright 2025 DXOS.org
//

import { Events } from '../../common';
import { defineModule, definePlugin, lazy } from '../../core';

const Layout = lazy(() => import('./Layout'));

export const LayoutPlugin = () =>
  definePlugin({ id: 'dxos.org/test/layout', name: 'Layout' }, [
    defineModule({
      id: 'dxos.org/test/layout/root',
      activatesOn: Events.Startup,
      activate: Layout,
    }),
  ]);
