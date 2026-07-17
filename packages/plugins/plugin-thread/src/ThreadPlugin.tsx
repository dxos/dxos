//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
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
  AppPlugin.addAppGraphModule({
    requires: AppGraphBuilder.requires,
    provides: AppGraphBuilder.provides,
    activate: AppGraphBuilder,
  }),
  AppPlugin.addNavigationResolverModule({
    requires: NavigationResolver.requires,
    provides: NavigationResolver.provides,
    activate: NavigationResolver,
  }),
  AppPlugin.addCreateObjectModule({
    requires: CreateObject.requires,
    provides: CreateObject.provides,
    activate: CreateObject,
  }),
  AppPlugin.addOperationHandlerModule({
    requires: OperationHandler.requires,
    provides: OperationHandler.provides,
    activate: OperationHandler,
  }),
  AppPlugin.addSchemaModule({
    schema: [Channel.Channel, Message.Message, Thread.Thread],
  }),
  AppPlugin.addSurfaceModule({
    requires: ReactSurface.requires,
    provides: ReactSurface.provides,
    activate: ReactSurface,
  }),
  AppPlugin.addTranslationsModule({ translations: [...translations, ...threadTranslations] }),
  // Default local-feed channel backend. Other plugins contribute additional
  // `ChannelBackend` providers (e.g. ATProto) earlier in plugin order.
  Plugin.addLazyModule(ChannelBackendFeed),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default ThreadPlugin;
