//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as AppCapability from '@dxos/app-toolkit/AppCapability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as FileCapabilities from '@dxos/plugin-file/FileCapabilities';
import * as FileEvents from '@dxos/plugin-file/FileEvents';

import { meta } from '#meta';
import { translations } from '#translations';
import { WnfsCapabilities } from '#types';

// eslint-disable-next-line import/no-relative-packages
import pluginSpec from '../../PLUGIN.mdl?raw';

export const BlobBackend = Capability.lazyModule(
  'BlobBackend',
  {
    // Blockstore/Instances are awaited in the module body, not declared here: they are absent by
    // design when EDGE is unconfigured.
    requires: [ClientCapabilities.Client],
    provides: [FileCapabilities.Backend],
    activatesOn: FileEvents.Start,
  },
  () => import('./blob-backend'),
);

export const Dependencies = Capability.lazyModule(
  'Dependencies',
  {
    requires: [ClientCapabilities.Client],
    // The file plugin's start, not wnfs's own: wnfs contributes no surface, so nothing would
    // ever fire its own start — and these are exactly what the blob backend above waits for.
    provides: [WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
    activatesOn: FileEvents.Start,
  },
  () => import('./dependencies'),
);

export const Translations = AppCapability.translations(translations);
export const PluginAsset = AppCapability.pluginAsset({
  pluginId: meta.profile.key,
  path: 'PLUGIN.mdl',
  content: pluginSpec,
  mimeType: 'application/x-mdl',
});
