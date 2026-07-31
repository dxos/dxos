//
// Copyright 2026 DXOS.org
//

import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';

import { AppGraphBuilder, AtprotoConnector, ReactSurface, RepoLayer } from '#capabilities';
import { meta } from '#meta';
import { translations } from '#translations';
import { AtprotoPublication } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../PLUGIN.mdl?raw';

export const AtprotoPlugin = Plugin.define(meta).pipe(
  Plugin.addModule(AppGraphBuilder),
  Plugin.addModule(AppCapability.schema([AtprotoPublication.AtprotoPublication])),
  Plugin.addModule(ReactSurface),
  Plugin.addModule(AtprotoConnector),
  Plugin.addModule(RepoLayer),
  Plugin.addModule(AppCapability.translations(translations)),
  Plugin.addModule(
    AppCapability.pluginAsset({
      pluginId: meta.profile.key,
      path: 'PLUGIN.mdl',
      content: pluginSpec,
      mimeType: 'application/x-mdl',
    }),
  ),
  Plugin.make,
);

export default AtprotoPlugin;
