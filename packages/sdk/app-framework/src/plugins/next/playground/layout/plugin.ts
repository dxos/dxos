//
// Copyright 2025 DXOS.org
//

import { Events } from '../../common';
import { definePlugin, lazy, defineModule } from '../../plugin';

const Layout = lazy(() => import('./Layout'));

export const LayoutPlugin = () =>
  definePlugin({ id: 'dxos.org/test/layout' }, [
    defineModule({
      id: 'dxos.org/test/layout/root',
      activatesOn: Events.Startup,
      activate: () => Layout(),
    }),
  ]);
