//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import { ActivationEvents, Capability, Plugin } from '@dxos/app-framework';
import { withPluginManager } from '@dxos/app-framework/testing';
import { AppActivationEvents } from '@dxos/app-toolkit';
import { Collection } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client';
import { SearchPlugin } from '@dxos/plugin-search';
import { SpacePlugin } from '@dxos/plugin-space';
import { corePlugins } from '@dxos/plugin-testing';
import { withLayout } from '@dxos/react-ui/testing';
import { translations as searchTranslation } from '@dxos/react-ui-search';

import { meta as pluginMeta } from '#meta';

import { type SimpleLayoutPluginOptions } from '../../SimpleLayoutPlugin';
import { translations } from '../../translations';
import { SimpleLayoutEvents } from '#types';

import { SimpleLayout } from './SimpleLayout';

import { ReactRoot, ReactSurface, State } from '#capabilities';

const createPluginManager = ({ isPopover }: { isPopover?: boolean }) => {
  return withPluginManager({
    setupEvents: [AppActivationEvents.SetupSettings],
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
          activatesOn: ActivationEvents.Startup,
          activatesAfter: [SimpleLayoutEvents.StateReady, AppActivationEvents.LayoutReady],
          activate: () => State({ initialState: { isPopover } }),
        })),
        Plugin.addModule({
          id: Capability.getModuleTag(ReactRoot),
          activatesOn: ActivationEvents.Startup,
          activate: ReactRoot,
        }),
        Plugin.addModule({
          id: Capability.getModuleTag(ReactSurface),
          activatesOn: ActivationEvents.Startup,
          activate: ReactSurface,
        }),
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
