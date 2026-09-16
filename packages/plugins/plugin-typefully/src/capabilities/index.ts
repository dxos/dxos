//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as BloggerCapabilities from '@dxos/plugin-blogger/BloggerCapabilities';
import * as BloggerEvents from '@dxos/plugin-blogger/BloggerEvents';
import * as ConnectorEvents from '@dxos/plugin-connector/ConnectorEvents';
import * as ConnectorSpec from '@dxos/plugin-connector/ConnectorSpec';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const Connector = Capability.lazyModule(
  'TypefullyConnector',
  { provides: [ConnectorSpec.Connector], activatesOn: ConnectorEvents.Start },
  () => import('./connector.ts'),
);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const PublisherService = Capability.lazyModule(
  'TypefullyPublisherService',
  { provides: [BloggerCapabilities.PublisherService], activatesOn: BloggerEvents.Start },
  () => import('./publisher-service.ts'),
);
export const Translations = AppCapability.translations(translations);
