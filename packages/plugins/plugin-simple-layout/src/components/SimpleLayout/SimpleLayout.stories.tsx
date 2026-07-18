//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Collection } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { SearchPlugin } from '@dxos/plugin-search/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { translations as searchTranslation } from '@dxos/react-ui-search/translations';
import { withLayout } from '@dxos/react-ui/testing';

import { ReactRoot, ReactSurface, State } from '#capabilities';
import { meta as pluginMeta } from '#meta';
import { translations } from '#translations';

import { type SimpleLayoutPluginOptions } from '../../SimpleLayoutPlugin';
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
          }),
      }),

      SearchPlugin(),
      SpacePlugin({}),

      // TODO(burdon): This should be factored ouf from SimpleLayoutPlugin.
      Plugin.define<SimpleLayoutPluginOptions>(pluginMeta).pipe(
        Plugin.addModule(({ isPopover = false }) => ({
          id: Capability.getModuleTag(State),
          requires: State.requires,
          provides: State.provides,
          activate: () => State({ initialState: { isPopover } }),
        })),
        Plugin.addLazyModule(ReactRoot),
        Plugin.addLazyModule(ReactSurface),
        Plugin.make,
      )({ isPopover }),
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
