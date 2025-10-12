//
// Copyright 2025 DXOS.org
//

import { Events } from '../../common';
import { defineModule, definePlugin, lazy } from '../../core';

const Main = lazy(() => import('./Main'));
const Toolbar = lazy(() => import('./Toolbar'));

export const GeneratorPlugin = definePlugin({ id: 'dxos.org/test/generator', name: 'Generator' }, () => [
  defineModule({
    id: 'dxos.org/test/generator/main',
    activatesOn: Events.Startup,
    activate: Main,
  }),
  defineModule({
    id: 'dxos.org/test/generator/toolbar',
    activatesOn: Events.Startup,
    activate: Toolbar,
  }),
]);
