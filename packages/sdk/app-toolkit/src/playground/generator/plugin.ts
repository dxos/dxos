//
// Copyright 2025 DXOS.org
//

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { DXN } from '@dxos/keys';

const Main = Capability.lazy('Main', () => import('./Main'));
const Toolbar = Capability.lazy('Toolbar', () => import('./Toolbar'));

export const GeneratorPlugin = Plugin.define({ id: DXN.make('org.dxos.test.generator'), name: 'Generator' }).pipe(
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: Main,
  }),
  Plugin.addModule({
    activatesOn: ActivationEvents.Startup,
    activate: Toolbar,
  }),
  Plugin.make,
);
