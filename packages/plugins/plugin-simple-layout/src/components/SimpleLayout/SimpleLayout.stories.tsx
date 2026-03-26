//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { withPluginManager } from '@dxos/app-framework/testing';
import { Collection } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { SearchPlugin } from '@dxos/plugin-search';
import { SpacePlugin } from '@dxos/plugin-space';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { translations as searchTranslation } from '@dxos/react-ui-searchlist';

import { SimpleLayoutPlugin } from '../../SimpleLayoutPlugin';
import { translations } from '../../translations';

import { SimpleLayout } from './SimpleLayout';

const createPluginManager = ({ isPopover }: { isPopover?: boolean }) => {
  return withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin({
        types: [Collection.Collection],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
            // const { invoke } = yield* Capability.get(Capabilities.OperationInvoker);
            // yield* invoke(ClientOperation.CreateIdentity, {});
            // const { space } = yield* invoke(SpaceOperation.Create, { name: 'Work' });
            // yield* invoke(SpaceOperation.AddObject, {
            //   target: space.db,
            //   object: Collection.make({ name: 'Projects', objects: [] }),
            // });
            // yield* invoke(SpaceOperation.AddObject, {
            //   target: space.db,
            //   object: Collection.make({ name: 'Documents', objects: [] }),
            // });
          }),
      }),
      SearchPlugin(),
      SpacePlugin({}),
      SimpleLayoutPlugin({ isPopover }),
    ],
  });
};

/**
 * NOTE: To expose to iphone on network:
 * `moon run storybook-react:serve dev -H 0.0.0.0`
 */
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

export const Default: Story = {
  decorators: [withLayout({ layout: 'column', classNames: 'relative' }), createPluginManager({})],
};

export const Popover: Story = {
  decorators: [withLayout({ layout: 'column', classNames: 'relative' }), createPluginManager({ isPopover: true })],
};
