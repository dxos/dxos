//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, CreateObject, NavigationResolver, ReactSurface } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { Book } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const LibraryPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activatesOn: AppActivationEvents.SetupAppGraph, activate: AppGraphBuilder }),
  AppPlugin.addCreateObjectModule({ activate: CreateObject }),
  AppPlugin.addNavigationResolverModule({ activatesOn: ClientEvents.ClientReady, activate: NavigationResolver }),
  AppPlugin.addSchemaModule({ schema: [Book.Book] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default LibraryPlugin;
