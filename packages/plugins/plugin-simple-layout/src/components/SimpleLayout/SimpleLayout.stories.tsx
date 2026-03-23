//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { ActivationEvents, Capabilities, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { Collection } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { ClientOperation } from '@dxos/plugin-client/operations';
import { SearchPlugin } from '@dxos/plugin-search';
import { SpacePlugin } from '@dxos/plugin-space';
import { SpaceOperation } from '@dxos/plugin-space/operations';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { translations as searchTranslation } from '@dxos/react-ui-searchlist';

import { OperationHandler, type SimpleLayoutStateOptions, State } from '../../capabilities';
import { meta as pluginMeta } from '../../meta';
import { type SimpleLayoutPluginOptions } from '../../SimpleLayoutPlugin';
import { translations } from '../../translations';

import { SimpleLayout } from './SimpleLayout';

const TestPlugin = Plugin.define<SimpleLayoutPluginOptions>(pluginMeta).pipe(
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  Plugin.addModule(({ isPopover = false }) => ({
    id: Capability.getModuleTag(State),
    activatesOn: ActivationEvents.Startup,
    activatesAfter: [AppActivationEvents.LayoutReady],
    activate: () => State({ initialState: { isPopover } } satisfies SimpleLayoutStateOptions),
  })),
  Plugin.addModule({
    id: 'setup',
    activatesOn: ActivationEvents.OperationInvokerReady,
    activate: Effect.fnUntraced(function* () {
      const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
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
        types: [Collection.Collection],
      }),
      SearchPlugin(),
      SpacePlugin({}),
      TestPlugin({ isPopover }),
    ],
  });
};

const meta = {
  title: 'plugins/plugin-simple-layout/components/SimpleLayout',
  component: SimpleLayout,
  parameters: {
    layout: 'fullscreen',
    translations: [...translations, ...searchTranslation],
  },
} satisfies Meta<typeof SimpleLayout>;

export default meta;

type Story = StoryObj<typeof meta>;

/**
 * NOTE: To expose to iphone on network:
 * `moon run storybook-react:serve dev -H 0.0.0.0`
 */
export const Default: Story = {
  decorators: [withLayout({ layout: 'column', classNames: 'relative' }), createPluginManager({ isPopover: false })],
};

export const Popover: Story = {
  decorators: [withLayout({ layout: 'column', classNames: 'relative' }), createPluginManager({ isPopover: true })],
};
