//
// Copyright 2023 DXOS.org
//

import { Capabilities, Events, contributes, defineModule, definePlugin } from '@dxos/app-framework';

import { IntentResolver, type LayoutState, State } from './capabilities';
import { Layout } from './components';
import { meta } from './meta';

export type StorybookPluginOptions = {
  initialState?: Partial<LayoutState>;
};

export const StorybookPlugin = definePlugin<StorybookPluginOptions | void>(meta, ({ initialState } = {}) => [
  defineModule({
    id: `${meta.id}/module/state`,
    activatesOn: Events.Startup,
    activatesAfter: [Events.LayoutReady],
    activate: () => State({ initialState }),
  }),
  defineModule({
    id: `${meta.id}/module/react-context`,
    activatesOn: Events.Startup,
    activate: () =>
      contributes(Capabilities.ReactContext, {
        id: 'storybook-layout',
        context: Layout,
      }),
  }),
  defineModule({
    id: `${meta.id}/module/intent-resolver`,
    activatesOn: Events.SetupIntentResolver,
    activate: IntentResolver,
  }),
]);
