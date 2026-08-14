//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import * as Effect from 'effect/Effect';

import * as Plugin from '@dxos/app-framework/Plugin';
import { withPluginManager } from '@dxos/app-framework/testing';
import { Collection } from '@dxos/echo';
import { ClientPlugin } from '@dxos/plugin-client/testing';
import { SearchPlugin } from '@dxos/plugin-search/testing';
import { SpacePlugin } from '@dxos/plugin-space/testing';
import { corePlugins } from '@dxos/plugin-testing';
import { translations as searchTranslation } from '@dxos/react-ui-search/translations';
import { withLayout } from '@dxos/react-ui/testing';

import { AppGraphBuilder, OperationHandler, ReactRoot, ReactSurface, SpotlightDismiss, State } from '#capabilities';
import { meta as pluginMeta } from '#meta';
import { type SimpleLayoutPluginOptions } from '#plugin';
import { translations } from '#translations';

import { SimpleLayout } from './SimpleLayout';

const createPluginManager = ({ isPopover }: { isPopover?: boolean }) => {
  return withPluginManager({
    plugins: [
      ...corePlugins(),
      ClientPlugin.make({
        types: [Collection.Collection],
        onClientInitialized: ({ client }) =>
          Effect.gen(function* () {
            yield* Effect.promise(() => client.halo.createIdentity());
          }),
      }),

      SearchPlugin.make(),
      SpacePlugin({}),

      // The full plugin minus `UrlHandler`, which rewrites `window.location` and would navigate
      // the storybook iframe away from the story.
      // TODO(burdon): This should be factored ouf from SimpleLayoutPlugin.
      Plugin.define<SimpleLayoutPluginOptions>(pluginMeta).pipe(
        Plugin.addModule(AppGraphBuilder),
        Plugin.addModule(OperationHandler),
        Plugin.addModule(State),
        Plugin.addModule(SpotlightDismiss),
        Plugin.addModule(ReactRoot),
        Plugin.addModule(ReactSurface),
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
