//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { meta } from '#meta';
import { translations } from '#translations';
import { AtprotoCapabilities, AtprotoEvents } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const AppGraphBuilder = AppCapability.appGraphBuilder(() => import('./app-graph-builder.ts'));
export const AtprotoConnector = Capability.lazyModule(
  'AtprotoConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector.ts'),
);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const ReactSurface = AppCapability.surface(() => import('./react-surface.ts'), {
  roles: ['org.dxos.role.article'],
});
export const RepoLayer = Capability.lazyModule(
  'RepoLayer',
  {
    requires: [ClientCapabilities.Client],
    provides: [AtprotoCapabilities.RepoLayer, AtprotoCapabilities.ReadRepoLayer],
    activatesOn: AtprotoEvents.Start,
  },
  () => import('./repo-layer.ts'),
);
export const Schema = AppCapability.schema(() => import('./schema.ts'));
export const Translations = AppCapability.translations(translations);
