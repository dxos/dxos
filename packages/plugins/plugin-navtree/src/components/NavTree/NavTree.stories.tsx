//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type StoryObj, type Meta } from '@storybook/react';
import { Schema } from 'effect';
import React from 'react';

import {
  contributes,
  Capabilities,
  IntentPlugin,
  createResolver,
  defineCapability,
  LayoutAction,
  SettingsPlugin,
  useCapability,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { live } from '@dxos/live-object';
import { GraphPlugin } from '@dxos/plugin-graph';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { Main } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';

import { NavTreePlugin } from '../../NavTreePlugin';
import { storybookGraphBuilders } from '../../testing';
import { NavTreeContainer } from '../NavTreeContainer';

faker.seed(1234);

const StoryState = defineCapability<{ tab: string }>('story-state');

const DefaultStory = () => {
  const state = useCapability(StoryState);

  return (
    <Main.NavigationSidebar label='Navigation' classNames='grid'>
      <NavTreeContainer tab={state.tab} />
    </Main.NavigationSidebar>
  );
};

const meta: Meta<typeof NavTreeContainer> = {
  title: 'plugins/plugin-navtree/NavTree',
  component: NavTreeContainer,
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        StorybookLayoutPlugin({ initialState: { sidebarState: 'expanded' } }),
        GraphPlugin(),
        IntentPlugin(),
        SettingsPlugin(),
        NavTreePlugin(),
      ],
      capabilities: (context) => [
        contributes(StoryState, live({ tab: 'default' })),
        contributes(Capabilities.IntentResolver, [
          createResolver({
            intent: LayoutAction.UpdateLayout,
            filter: (data): data is Schema.Schema.Type<typeof LayoutAction.SwitchWorkspace.fields.input> =>
              Schema.is(LayoutAction.SwitchWorkspace.fields.input)(data),
            resolve: ({ subject }) => {
              const state = context.requestCapability(StoryState);
              state.tab = subject;
            },
          }),
        ]),
        contributes(Capabilities.AppGraphBuilder, storybookGraphBuilders),
      ],
    }),
    withLayout({ fullscreen: true, tooltips: true }),
  ],
};

export default meta;

type Story = StoryObj<typeof NavTreeContainer>;

export const Default: Story = {};
