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
import { Main } from '@dxos/react-ui';
import { withLayout } from '@dxos/react-ui/testing';
import { StackContext } from '@dxos/react-ui-stack';

import { DeckSettings, DeckState } from '../../capabilities';
import { meta as pluginMeta } from '../../meta';
import { translations } from '../../translations';

import { Plank, PlankComponentProps } from './Plank';

const TestPlugin = Plugin.define(pluginMeta).pipe(
  Plugin.addModule({
    activatesOn: AppActivationEvents.SetupSettings,
    activate: DeckSettings,
  }),
  Plugin.addModule({
    id: Capability.getModuleTag(DeckState),
    activatesOn: AppActivationEvents.AppGraphReady,
    activate: () => DeckState(),
  }),
  Plugin.make,
);

type PlankStoryProps = Pick<PlankComponentProps, 'id'>;

const DefaultStory = ({ id }: PlankStoryProps) => {
  const { graph } = useAppGraph();

  return (
    <Main.Root>
      <Main.Content bounce handlesFocus>
        <div role='none' className='relative overflow-hidden bg-deck-surface'>
          <StackContext.Provider value={{ orientation: 'horizontal', size: 'contain', rail: true }}>
            <Plank.Root graph={graph} part='solo' layoutMode='solo'>
              <Plank.Content solo companion={false} encapsulate={false}>
                <Plank.Component id={id} part='solo-primary' layoutMode='solo' />
              </Plank.Content>
            </Plank.Root>
          </StackContext.Provider>
        </div>
      </Main.Content>
    </Main.Root>
  );
};

const meta = {
  title: 'plugins/plugin-deck/containers/Plank',
  component: DefaultStory,
  decorators: [
    withLayout({ layout: 'column' }),
    withPluginManager({
      plugins: [...corePlugins(), TestPlugin()],
      setupEvents: [AppActivationEvents.SetupSettings],
    }),
  ],
  parameters: {
    layout: 'fullscreen',
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

// TODO(burdon): Need to define surface provider?
export const Default: Story = {
  args: {
    id: 'plank-1',
  },
};
