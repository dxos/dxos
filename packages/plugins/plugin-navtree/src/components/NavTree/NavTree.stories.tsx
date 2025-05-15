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
import { Input, Main } from '@dxos/react-ui';
import { useAttendableAttributes } from '@dxos/react-ui-attention';
import { attentionSurface, defaultTx, mx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';

import { NavTreePlugin } from '../../NavTreePlugin';
import { storybookGraphBuilders } from '../../testing';
import { NavTreeContainer } from '../NavTreeContainer';

faker.seed(1234);

const StoryState = defineCapability<{ tab: string }>('story-state');

// TODO(burdon): Define 3 semantic levels.
// TODO(burdon): How to adjust existing surfaces for this test?
// TODO(burdon): How to toggle attention in this test?
// TODO(burdon): Fix outline (e.g., button in sidebar nav is clipped when focused).

const container = 'flex flex-col grow gap-2 p-4 rounded-md';

const TestPanel = () => {
  const attentionAttrs = useAttendableAttributes('test');

  return (
    <div className={mx('flex flex-col grow bs-full p-4', attentionSurface)} {...attentionAttrs}>
      <div className={mx(container, 'bg-groupSurface')}>
        <Input.Root>
          <Input.Label>Level 1</Input.Label>
        </Input.Root>
        <div className={mx(container, 'bg-baseSurface')}>
          <Input.Root>
            <Input.Label>Level 2</Input.Label>
          </Input.Root>
          <div className={mx(container, 'bg-inputSurface')}>
            <Input.Root>
              <Input.Label>Level 3</Input.Label>
              <Input.TextArea placeholder='Enter text' />
            </Input.Root>
          </div>
        </div>
      </div>
    </div>
  );
};

const DefaultStory = () => {
  const state = useCapability(StoryState);

  return (
    <Main.Root>
      <Main.NavigationSidebar label='Navigation' classNames='grid'>
        <NavTreeContainer tab={state.tab} />
      </Main.NavigationSidebar>
      <Main.Content bounce handlesFocus>
        <TestPanel />
      </Main.Content>
    </Main.Root>
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
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
};

export default meta;

type Story = StoryObj<typeof NavTreeContainer>;

export const Default: Story = {};
