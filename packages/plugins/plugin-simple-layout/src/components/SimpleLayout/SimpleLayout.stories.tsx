//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { Capability, Common, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { ClientOperation, ClientPlugin } from '@dxos/plugin-client';
import { SearchPlugin } from '@dxos/plugin-search';
import { SpacePlugin } from '@dxos/plugin-space';
import { SpaceOperation } from '@dxos/plugin-space/types';
import { corePlugins } from '@dxos/plugin-testing';
import { withTheme } from '@dxos/react-ui/testing';
import { translations as searchTranslation } from '@dxos/react-ui-searchlist';
import { Collection } from '@dxos/schema';

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
  Plugin.addModule({
    id: 'setup',
    activatesOn: Common.ActivationEvent.OperationInvokerReady,
    activate: Effect.fnUntraced(function* () {
      const { invoke } = yield* Capability.get(Common.Capability.OperationInvoker);
      yield* invoke(ClientOperation.CreateIdentity, {});
      const { space: work } = yield* invoke(SpaceOperation.Create, { name: 'Work Space' });
      const { space: sharedProject } = yield* invoke(SpaceOperation.Create, { name: 'Shared Project' });

      // Add collections to Work Space.
      yield* invoke(SpaceOperation.AddObject, {
        target: work.db,
        object: Collection.make({ name: 'Projects', objects: [] }),
      });
      yield* invoke(SpaceOperation.AddObject, {
        target: work.db,
        object: Collection.make({ name: 'Documents', objects: [] }),
      });

      // Add collections to Shared Project.
      yield* invoke(SpaceOperation.AddObject, {
        target: sharedProject.db,
        object: Collection.make({ name: 'Tasks', objects: [] }),
      });
      yield* invoke(SpaceOperation.AddObject, {
        target: sharedProject.db,
        object: Collection.make({ name: 'Notes', objects: [] }),
      });
    }),
  }),
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
