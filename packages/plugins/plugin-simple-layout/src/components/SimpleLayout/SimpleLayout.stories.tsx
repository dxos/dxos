//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientPlugin } from '@dxos/plugin-client';
import { SearchPlugin } from '@dxos/plugin-search';
import { SpacePlugin } from '@dxos/plugin-space';
import { corePlugins } from '@dxos/plugin-testing';
import { withTheme } from '@dxos/react-ui/testing';
import { translations as searchTranslation } from '@dxos/react-ui-searchlist';

import { OperationResolver, type SimpleLayoutStateOptions, State } from '../../capabilities';
import { meta as pluginMeta } from '../../meta';
import { type SimpleLayoutPluginOptions } from '../../SimpleLayoutPlugin';
import { translations } from '../../translations';

import { SimpleLayout } from './SimpleLayout';

const TestPlugin = Plugin.define<SimpleLayoutPluginOptions>(pluginMeta).pipe(
  Plugin.addModule(({ isPopover = false }) => ({
    id: Capability.getModuleTag(State),
    activatesOn: Common.ActivationEvent.Startup,
    activatesAfter: [Common.ActivationEvent.LayoutReady],
    activate: () => State({ initialState: { isPopover } } satisfies SimpleLayoutStateOptions),
  })),
  Common.Plugin.addOperationResolverModule({ activate: OperationResolver }),
  Plugin.make,
);

const createPluginManager = ({ isPopover }: { isPopover: boolean }) => {
  return withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        onClientInitialized: async ({ client }) => {
          await client.halo.createIdentity();
          await client.spaces.create({ name: 'Work Space' });
          await client.spaces.create({ name: 'Shared Project' });
        },
      }),
      SpacePlugin({}),
      SearchPlugin(),
      TestPlugin({ isPopover }),
    ],
  });
};

const meta = {
  title: 'plugins/plugin-simple-layout/SimpleLayout',
  component: SimpleLayout,
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...searchTranslation],
  },
} satisfies Meta<typeof SimpleLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {
  decorators: [withTheme, createPluginManager({ isPopover: false })],
};

export const Popover: Story = {
  decorators: [withTheme, createPluginManager({ isPopover: true })],
};
