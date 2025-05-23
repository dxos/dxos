//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { Capabilities, contributes, Events, defineModule, definePlugin } from '@dxos/app-framework';

import { IntentResolver, type LayoutState, State } from './capabilities';
import { Layout } from './components';
import { meta } from './meta';

export const StorybookLayoutPlugin = ({ initialState }: { initialState?: LayoutState } = {}) =>
  definePlugin(meta, [
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
          context: ({ children }) => <Layout>{children}</Layout>,
        }),
    }),
    defineModule({
      id: `${meta.id}/module/intent-resolver`,
      activatesOn: Events.SetupIntentResolver,
      activate: IntentResolver,
    }),
  ]);
