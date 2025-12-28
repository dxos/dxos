//
// Copyright 2023 DXOS.org
//

import { Capabilities, Capability, Events, Plugin } from '@dxos/app-framework';

import { IntentResolver, type LayoutState, State } from './capabilities';
import { Layout } from './components';
import { meta } from './meta';

export type StorybookLayoutPluginOptions = {
  initialState?: Partial<LayoutState>;
};

export const StorybookLayoutPlugin = Plugin.define<StorybookLayoutPluginOptions>(meta).pipe(
  Plugin.addModule(({ initialState }) => ({
    activatesOn: Events.Startup,
    activatesAfter: [Events.LayoutReady],
    activate: () => State({ initialState }),
  })),
  Plugin.addModule({
    id: 'react-context',
    activatesOn: Events.Startup,
    activate: () =>
      Capability.contributes(Capabilities.ReactContext, {
        id: 'storybook-layout',
        context: Layout,
      }),
  }),
  Plugin.addModule({
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.make,
);
