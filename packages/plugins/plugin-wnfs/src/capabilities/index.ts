//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { ClientCapabilities } from '@dxos/plugin-client';
import * as FileCapabilities from '@dxos/plugin-file/FileCapabilities';
import * as FileEvents from '@dxos/plugin-file/FileEvents';

import * as WnfsCapabilities from '../types/WnfsCapabilities';

export const BlobBackend = Capability.lazyModule(
  'BlobBackend',
  {
    requires: [ClientCapabilities.Client, WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
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
    // ever fire its own start — and these are exactly the requires of the blob backend below.
    provides: [WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
    activatesOn: FileEvents.Start,
  },
  () => import('./dependencies'),
);
