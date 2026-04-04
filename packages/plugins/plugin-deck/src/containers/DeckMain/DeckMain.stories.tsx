//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useCallback } from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';

import { DeckState } from '../../capabilities';
import { meta as pluginMeta } from '../../meta';
import { translations } from '../../translations';

import { DeckMain, type DeckMainProps, type LayoutChangeRequest } from './DeckMain';

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: () => DeckState(),
  }),
  Plugin.make,
);

const DeckMainStory = (args: DeckMainProps) => {
  const handleLayoutChange = useCallback((request: LayoutChangeRequest) => {
    console.log('layout change', request);
  }, []);

  return <DeckMain {...args} onLayoutChange={handleLayoutChange} />;
};

const meta = {
  title: 'plugins/plugin-deck/containers/DeckMain',
  component: DeckMain,
  render: (args) => <DeckMainStory {...args} />,
  decorators: [
    withLayout({ layout: 'fullscreen' }),
    withPluginManager({
      plugins: [...corePlugins(), TestPlugin()],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DeckMain>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  args: {
    onLayoutChange: () => {},
  },
};
