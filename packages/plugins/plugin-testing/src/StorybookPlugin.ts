//
// Copyright 2023 DXOS.org
//

import * as Effect from 'effect/Effect';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';

import { OperationHandler, State } from '#capabilities';
import { Layout } from '#components';
import { meta } from '#meta';
import { StorybookCapabilities } from '#types';

export type StorybookPluginOptions = {
  initialState?: Partial<StorybookCapabilities.LayoutStateProps>;
};

export const StorybookPlugin = Plugin.define<StorybookPluginOptions>(meta).pipe(
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addReactContextModule({
    requires: [],
    provides: [Capabilities.ReactContext],
    activate: () =>
      Effect.succeed([
        Capability.provide(Capabilities.ReactContext, {
          id: 'storybook-layout',
          context: Layout,
        }),
      ]),
  }),
  Plugin.addModule(({ initialState }) => ({
    id: Capability.getModuleTag(State),
    requires: State.requires,
    provides: State.provides,
    // Migration bridge for unmigrated LayoutReady listeners.
    compatFires: [AppActivationEvents.LayoutReady],
    activate: () => State({ initialState }),
  })),
  Plugin.make,
);

export default StorybookPlugin;
