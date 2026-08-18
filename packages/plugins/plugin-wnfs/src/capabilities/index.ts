//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as FileCapabilities from '@dxos/plugin-file/FileCapabilities';
import * as FileEvents from '@dxos/plugin-file/FileEvents';

import { WnfsCapabilities } from '#types';

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
