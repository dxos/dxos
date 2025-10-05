//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import { withTheme } from '@dxos/react-ui/testing';
import { Schema } from 'effect';
import React from 'react';

import {
  Capabilities,
  IntentPlugin,
  LayoutAction,
  SettingsPlugin,
  contributes,
  createResolver,
  defineCapability,
  useCapability,
} from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { live } from '@dxos/live-object';
import { AttentionPlugin } from '@dxos/plugin-attention';
import { ClientPlugin } from '@dxos/plugin-client';
import { GraphPlugin } from '@dxos/plugin-graph';
import { SpacePlugin } from '@dxos/plugin-space';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { IconButton, Input, Main, Toolbar } from '@dxos/react-ui';
import { useAttention, useAttentionAttributes } from '@dxos/react-ui-attention';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { defaultTx, mx } from '@dxos/react-ui-theme';

import { NavTreePlugin } from '../../NavTreePlugin';
import { storybookGraphBuilders } from '../../testing';
import { translations } from '../../translations';
import { NavTreeContainer } from '../NavTreeContainer';

faker.seed(1234);

const StoryState = defineCapability<{ tab: string }>('story-state');

// TODO(burdon): Fix outline (e.g., button in sidebar nav is clipped when focused).
// TODO(burdon): Consider similar containment of: Table, Sheet, Kanban Column, Form, etc.

const container = 'flex flex-col grow gap-2 p-4 rounded-md';

// TODO(burdon): Factor out PlankHeader.
const StoryPlankHeading = ({ attendableId }: { attendableId: string }) => {
  const { hasAttention } = useAttention(attendableId);
  console.log('hasAttention', hasAttention);
  return (
    <div className='flex p-1 items-center border-b border-separator'>
      <IconButton
        density='coarse'
        icon='ph--atom--regular'
        label='Test'
        iconOnly
        variant={hasAttention ? 'primary' : 'ghost'}
        classNames='is-[--rail-action] bs-[--rail-action]'
      />
      <StackItem.ResizeHandle />
    </div>
  );
};

const StoryPlank = ({ attendableId }: { attendableId: string }) => {
  const attentionAttrs = useAttentionAttributes(attendableId);

  return (
    <StackItem.Root
      item={{ id: attendableId }}
      {...attentionAttrs}
      classNames='bg-baseSurface border-ie border-separator'
      size={30}
    >
      <StoryPlankHeading attendableId={attendableId} />
      <StackItem.Content toolbar>
        <Toolbar.Root classNames='border-b border-subduedSeparator'>
          <Toolbar.Button>Test</Toolbar.Button>
        </Toolbar.Root>

        <div className={mx(container, 'm-2 bg-activeSurface')}>
          <Input.Root>
            <Input.Label>Level 1 (group)</Input.Label>
          </Input.Root>
          <div className={mx(container, 'bg-baseSurface')}>
            <Input.Root>
              <Input.Label>Level 2 (base)</Input.Label>
              <Input.TextArea placeholder='Enter text' />
            </Input.Root>
          </div>
        </div>
      </StackItem.Content>
    </StackItem.Root>
  );
};

const DefaultStory = () => {
  const state = useCapability(StoryState);

  return (
    <Main.Root complementarySidebarState='closed'>
      <Main.NavigationSidebar label='Navigation' classNames='grid'>
        <NavTreeContainer tab={state.tab} />
      </Main.NavigationSidebar>
      <Main.Content bounce handlesFocus>
        <Stack orientation='horizontal' size='contain'>
          <StoryPlank attendableId='space-0:object-0' />
          <StoryPlank attendableId='space-0:object-1' />
        </Stack>
      </Main.Content>
    </Main.Root>
  );
};

const meta = {
  title: 'plugins/plugin-navtree/NavTree',
  component: NavTreeContainer,
  render: DefaultStory,
  decorators: [withTheme, withPluginManager({
      plugins: [
        ThemePlugin({ tx: defaultTx }),
        GraphPlugin(),
        IntentPlugin(),
        SettingsPlugin(),
        AttentionPlugin(),
        NavTreePlugin(),
        StorybookLayoutPlugin({ initialState: { sidebarState: 'expanded' } }),],
      capabilities: (context) => [
        contributes(StoryState, live({ tab: 'space-0' })),
        contributes(Capabilities.AppGraphBuilder, storybookGraphBuilders(context)),
        contributes(Capabilities.IntentResolver, [
          createResolver({
            intent: LayoutAction.UpdateLayout,
            filter: (data): data is Schema.Schema.Type<typeof LayoutAction.SwitchWorkspace.fields.input> =>
              Schema.is(LayoutAction.SwitchWorkspace.fields.input)(data),
            resolve: ({ subject }) => {
              const state = context.getCapability(StoryState);
              state.tab = subject;
            },
          }),
        ]),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof NavTreeContainer>;

export default meta;

type Story = StoryObj<typeof NavTreeContainer>;

export const Default: Story = {};

// TODO(wittjosiah): Deduplicate plugins/capabilities with default story.
export const WithClient: Story = {
  decorators: [
    withPluginManager({
      plugins: [
        ClientPlugin({
          onClientInitialized: async ({ client }) => {
            await client.halo.createIdentity();
          },
        }),
        SpacePlugin({}),
        GraphPlugin(),
        IntentPlugin(),
        SettingsPlugin(),
        AttentionPlugin(),

        // UI
        ThemePlugin({ tx: defaultTx }),
        NavTreePlugin(),
        StorybookLayoutPlugin({ initialState: { sidebarState: 'expanded' } }),
      ],
      capabilities: (context) => [
        contributes(StoryState, live({ tab: 'space-0' })),
        contributes(Capabilities.IntentResolver, [
          createResolver({
            intent: LayoutAction.UpdateLayout,
            filter: (data): data is Schema.Schema.Type<typeof LayoutAction.SwitchWorkspace.fields.input> =>
              Schema.is(LayoutAction.SwitchWorkspace.fields.input)(data),
            resolve: ({ subject }) => {
              const state = context.getCapability(StoryState);
              state.tab = subject;
            },
          }),
        ]),
      ],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
};
