//
// Copyright 2023 DXOS.org
//

import { ActivationEvents, Plugin } from '@dxos/app-framework';
import { AppPlugin } from '@dxos/app-toolkit';
import { translations as threadTranslations } from '@dxos/react-ui-thread/translations';
import { Channel, Message, Thread } from '@dxos/types';

import {
  AppGraphBuilder,
  ChannelBackendFeed,
  CreateObject,
  NavigationResolver,
  OperationHandler,
  ReactSurface,
} from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

// TODO(wittjosiah): Rename to ChatPlugin.

export const ThreadPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activate: AppGraphBuilder }),
  AppPlugin.addNavigationResolverModule({ activate: NavigationResolver }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addOperationHandlerModule({ activate: OperationHandler }),
  AppPlugin.addSchemaModule({
    schema: [Channel.Channel, Message.Message, Thread.Thread],
  }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...threadTranslations] }),
  // Default local-feed channel backend. Other plugins contribute additional
  // `ChannelBackend` providers (e.g. ATProto) earlier in plugin order.
  Plugin.addModule({
    id: 'channel-backend-feed',
    activatesOn: ActivationEvents.Startup,
    activate: ChannelBackendFeed,
  }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.id, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default ThreadPlugin;
