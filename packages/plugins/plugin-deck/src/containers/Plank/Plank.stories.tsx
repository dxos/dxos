//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useMemo } from 'react';

import { Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Surface } from '@dxos/app-framework/ui';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { corePlugins } from '@dxos/plugin-testing';
import { faker } from '@dxos/random';
import { Main } from '@dxos/react-ui';
import { Json } from '@dxos/react-ui-syntax-highlighter';
import { Loading } from '@dxos/react-ui/testing';
import { StackContext } from '@dxos/react-ui-stack';
import { Organization } from '@dxos/types';

import { meta as pluginMeta } from '../../meta';

import { translations } from '../../translations';

import { Plank } from './Plank';

import { DeckSettings, DeckState } from '#capabilities';

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

faker.seed(101);

const storySurfaceExtension = Capability.contributes(
  Capabilities.ReactSurface,
  Surface.create({
    id: 'story-article',
    role: 'article',
    component: ({ data }) => {
      const subject = (data as any)?.subject;
      if (!subject) {
        return <Loading />;
      }

      return (
        <Json.Root data={subject}>
          <Json.Content />
        </Json.Root>
      );
    },
  }),
);

const DefaultStory = () => {
  const { graph } = useAppGraph();
  const item = useMemo(() => Organization.make({ name: faker.company.name() }), []);
  const node = useMemo(() => ({ id: item.id, data: item, type: 'test', properties: { label: item.name } }), [item]);

  return (
    <Main.Root>
      <Main.Content bounce handlesFocus classNames='grid' style={{ '--main-spacing': '0' } as any}>
        <div role='none' className='relative overflow-hidden bg-deck-surface'>
          <StackContext.Provider value={{ orientation: 'horizontal', size: 'contain', rail: true }}>
            <Plank.Root graph={graph} part='solo' layoutMode='solo'>
              <Plank.Content solo companion={false} encapsulate={false}>
                <Plank.Component id={item.id} part='solo-primary' node={node as any} />
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
    withPluginManager({
      plugins: [...corePlugins(), TestPlugin()],
      capabilities: [storySurfaceExtension],
      setupEvents: [AppActivationEvents.SetupSettings],
    }),
  ],
  parameters: {
    translations,
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
