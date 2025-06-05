//
// Copyright 2025 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { Events } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { D3ForceGraph } from '@dxos/plugin-explorer';
import { Toolbar } from '@dxos/react-ui';
import { List } from '@dxos/react-ui-list';
import { withLayout, withTheme } from '@dxos/storybook-utils';

import { testPlugins } from './testing';
import translations from '../translations';

const DefaultStory = () => {
  return (
    <div className='grow grid grid-rows-[min-content_1fr]'>
      <QueryToolbar />
      <div className='grow grid grid-cols-[1fr,400px] divide-x divide-separator'>
        <D3ForceGraph />
        <ItemList />
      </div>
    </div>
  );
};

const ItemList = () => {
  return <List.Root items={[]}></List.Root>;
};

const QueryToolbar = () => {
  return (
    <Toolbar.Root>
      <Toolbar.Button>Test</Toolbar.Button>
    </Toolbar.Root>
  );
};

const meta: Meta<typeof DefaultStory> = {
  title: 'plugins/plugin-assistant/Query',
  render: DefaultStory,
  decorators: [
    withPluginManager({
      plugins: testPlugins,
      fireEvents: [Events.SetupArtifactDefinition],
    }),
    withTheme,
    withLayout({ fullscreen: true }),
  ],
  parameters: {
    translations,
  },
};

type Story = StoryObj<typeof DefaultStory>;

export default meta;

export const Default: Story = {
  args: {},
};
