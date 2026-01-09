//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capability, Common, Plugin } from '@dxos/app-framework';

import { IntentResolver, State } from './capabilities';
import { Layout } from './components';
import { meta } from './meta';
import { type LayoutState } from './types';

export type StorybookPluginOptions = {
  initialState?: Partial<LayoutState>;
};

export const StorybookPlugin = Plugin.define<StorybookPluginOptions>(meta).pipe(
  Plugin.addModule(({ initialState }) => ({
    id: Capability.getModuleTag(State),
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.LayoutReady],
    activate: () => State({ initialState }),
  })),
  Common.Plugin.addReactContextModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(Common.Capability.ReactContext, {
          id: 'storybook-layout',
          context: Layout,
        }),
      ),
  }),
  Plugin.addModule({
    activatesOn: Common.ActivationEvent.SetupIntentResolver,
    activate: IntentResolver,
  }),
  Plugin.make,
);
