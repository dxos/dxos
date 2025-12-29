//
// Copyright 2023 DXOS.org
//

import { Capability, Common, Plugin } from '@dxos/app-framework';

import { IntentResolver, type LayoutState, State } from './capabilities';
import { Layout } from './components';
import { meta } from './meta';

export type StorybookLayoutPluginOptions = {
  initialState?: Partial<LayoutState>;
};

export const StorybookLayoutPlugin = Plugin.define<StorybookLayoutPluginOptions>(meta).pipe(
  Plugin.addModule(({ initialState }) => ({
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.LayoutReady],
    activate: () => State({ initialState }),
  })),
  Plugin.addModule({
    id: 'react-context',
    activatesOn: Common.ActivationEvent.Startup,
    activate: () =>
      Capability.contributes(Common.Capability.ReactContext, {
        id: 'storybook-layout',
        context: Layout,
      }),
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.make,
);
