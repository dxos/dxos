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
import { AttentionPlugin } from '@dxos/plugin-attention';
import { GraphPlugin } from '@dxos/plugin-graph';
import { StorybookLayoutPlugin } from '@dxos/plugin-storybook-layout';
import { ThemePlugin } from '@dxos/plugin-theme';
import { faker } from '@dxos/random';
import { IconButton, Input, Main, Toolbar } from '@dxos/react-ui';
import { useAttendableAttributes, useAttention } from '@dxos/react-ui-attention';
import { Stack, StackItem } from '@dxos/react-ui-stack';
import { defaultTx, mx } from '@dxos/react-ui-theme';
import { withLayout } from '@dxos/storybook-utils';

import { NavTreePlugin } from '../../NavTreePlugin';
import { storybookGraphBuilders } from '../../testing';
import { NavTreeContainer } from '../NavTreeContainer';

faker.seed(1234);

const StoryState = defineCapability<{ tab: string }>('story-state');

// TODO(burdon): How to adjust existing surfaces for this test?
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
        classNames={mx('w-[40px] h-[40px]', hasAttention && 'bg-accentSurface text-accentSurfaceText')}
      />
      <StackItem.ResizeHandle />
    </div>
  );
};

const StoryPlank = ({ attendableId }: { attendableId: string }) => {
  const attentionAttrs = useAttendableAttributes(attendableId);

  return (
    <StackItem.Root
      item={{ id: attendableId }}
      {...attentionAttrs}
      classNames='bg-baseSurface border-ie border-separator'
      size={20}
    >
      <StoryPlankHeading attendableId={attendableId} />
      <StackItem.Content toolbar>
        {/* TODO(burdon): Should the separator be applied by StackItem.Content? */}
        <Toolbar.Root classNames='border-be border-separator'>
          <Toolbar.Button>Test</Toolbar.Button>
        </Toolbar.Root>

        <div className={mx(container, 'm-2 bg-groupSurface')}>
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
        AttentionPlugin(),
      ],
      capabilities: (context) => [
        contributes(StoryState, live({ tab: 'space-0' })),
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
