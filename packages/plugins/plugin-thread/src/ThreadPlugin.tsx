//
// Copyright 2023 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppCapability } from '@dxos/app-toolkit';
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
  Plugin.addLazyModule(AppGraphBuilder),
  Plugin.addLazyModule(NavigationResolver),
  Plugin.addLazyModule(CreateObject),
  Plugin.addLazyModule(OperationHandler),
  Plugin.addLazyModule(AppCapability.schema([Channel.Channel, Message.Message, Thread.Thread])),
  Plugin.addLazyModule(ReactSurface),
  Plugin.addLazyModule(AppCapability.translations([...translations, ...threadTranslations])),
  // Default local-feed channel backend. Other plugins contribute additional
  // `ChannelBackend` providers (e.g. ATProto) earlier in plugin order.
  Plugin.addLazyModule(ChannelBackendFeed),
  Plugin.addLazyModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default ThreadPlugin;
