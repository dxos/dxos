//
// Copyright 2026 DXOS.org
//

import { Plugin } from '@dxos/app-framework';
import { AppActivationEvents, AppPlugin } from '@dxos/app-toolkit';
import { ClientEvents } from '@dxos/plugin-client';

import { AppGraphBuilder, AtprotoConnector, ReactSurface, RepoLayer } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { AtprotoPublication } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const AtprotoPlugin = Plugin.define(meta).pipe(
  AppPlugin.addAppGraphModule({ activatesOn: AppActivationEvents.SetupAppGraph, activate: AppGraphBuilder }),
  AppPlugin.addSchemaModule({ schema: [AtprotoPublication.AtprotoPublication] }),
  AppPlugin.addSurfaceModule({ activate: ReactSurface }),
  Plugin.addModule({ activatesOn: AppActivationEvents.SetupConnectors, activate: AtprotoConnector }),
  Plugin.addModule({ activatesOn: ClientEvents.ClientReady, activate: RepoLayer }),
  AppPlugin.addTranslationsModule({ translations }),
  AppPlugin.addPluginAssetModule({
    asset: { pluginId: meta.profile.key, path: 'PLUGIN.mdl', content: pluginSpec, mimeType: 'application/x-mdl' },
  }),
  Plugin.make,
);

export default AtprotoPlugin;
