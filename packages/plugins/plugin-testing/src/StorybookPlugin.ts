//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { OperationResolver, State } from './capabilities';
import { Layout } from './components';
import { meta } from './meta';
import { type LayoutStateProps } from './types';

export type StorybookPluginOptions = {
  initialState?: Partial<LayoutStateProps>;
};

export const StorybookPlugin = Plugin.define<StorybookPluginOptions>(meta).pipe(
  AppPlugin.addOperationResolverModule({
    activate: OperationResolver,
  }),
  AppPlugin.addReactContextModule({
    activate: () =>
      Effect.succeed(
        Capability.contributes(Capabilities.ReactContext, {
          id: 'storybook-layout',
          context: Layout,
        }),
      ),
  }),
  Plugin.addModule(({ initialState }) => ({
    id: Capability.getModuleTag(State),
    activatesOn: ActivationEvents.Startup,
    activatesAfter: [AppActivationEvents.LayoutReady],
    activate: () => State({ initialState }),
  })),
  Plugin.make,
);
