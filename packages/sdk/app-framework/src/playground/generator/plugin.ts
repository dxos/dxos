//
// Copyright 2025 DXOS.org
//

import { Events } from '../../common';
import { Capability, Plugin } from '../../core';

const Main = Capability.lazy('Main', () => import('./Main'));
const Toolbar = Capability.lazy('Toolbar', () => import('./Toolbar'));

export const GeneratorPlugin = Plugin.define({ id: 'dxos.org/test/generator', name: 'Generator' }).pipe(
  Plugin.addModule({
    activatesOn: Events.Startup,
    activate: Main,
  }),
  Plugin.addModule({
    activatesOn: Events.Startup,
    activate: Toolbar,
  }),
  Plugin.make,
);
