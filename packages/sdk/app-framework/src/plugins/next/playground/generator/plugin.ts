//
// Copyright 2025 DXOS.org
//

import { Events } from '../../common';
import { defineModule, definePlugin, lazy } from '../../plugin';

const Main = lazy(() => import('./Main'));
const Toolbar = lazy(() => import('./Toolbar'));

export const GeneratorPlugin = () =>
  definePlugin({ id: 'dxos.org/test/generator' }, [
    defineModule({
      id: 'dxos.org/test/generator/main',
      activatesOn: Events.Startup,
      activate: async () => [await Main(), await Toolbar()],
    }),
  ]);
