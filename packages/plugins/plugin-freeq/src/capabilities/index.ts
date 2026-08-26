//
// Copyright 2026 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ThreadCapabilities from '@dxos/plugin-thread/ThreadCapabilities';
import * as ThreadEvents from '@dxos/plugin-thread/ThreadEvents';

import { meta } from '#meta';
import { translations } from '#translations';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';
import * as FreeqCapabilities from '../FreeqCapabilities';

// Contributes both the connection manager and the channel backend (see channel-backend.ts).
export const ChannelBackend = Capability.lazyModule(
  'FreeqChannelBackend',
  {
    provides: [FreeqCapabilities.ConnectionManager, ThreadCapabilities.ChannelBackend],
    activatesOn: ThreadEvents.Start,
  },
  () => import('./channel-backend'),
);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
export const Schema = AppCapability.schema(() => import('./schema'));
export const Translations = AppCapability.translations(translations);
