//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React from 'react';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { Stack } from '@dxos/react-ui-stack';

import { DeckState } from '../../capabilities';
import { meta as pluginMeta } from '../../meta';
import { translations } from '../../translations';

import { PlankParts, type PlankRootProps } from './Plank';

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: () => DeckState(),
  }),
  Plugin.make,
);

type PlankStoryProps = {
  id: string;
  layoutMode: PlankRootProps['layoutMode'];
  part: PlankRootProps['part'];
};

const PlankStory = ({ id, layoutMode, part }: PlankStoryProps) => {
  const { graph } = useAppGraph();

  return (
    <Stack orientation='horizontal'>
      <PlankParts.Root graph={graph} layoutMode={layoutMode} part={part}>
        <PlankParts.Article id={id} layoutMode={layoutMode} part={part} />
      </PlankParts.Root>
    </Stack>
  );
};

const meta = {
  title: 'plugins/plugin-deck/containers/Plank',
  component: PlankStory,
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
} satisfies Meta<typeof PlankStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// TODO(burdon): Need to define surface provider?
export const Default: Story = {
  args: {
    id: 'plank-1',
    part: 'solo',
    layoutMode: 'deck',
  },
};
