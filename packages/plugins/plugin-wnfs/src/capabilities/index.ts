//
// Copyright 2025 DXOS.org
//

import { Capability } from '@dxos/app-framework';
import { ClientCapabilities } from '@dxos/plugin-client';
import { FileCapabilities } from '@dxos/plugin-file/types';

import { WnfsCapabilities } from '#types';

export const BlobBackend = Capability.lazyModule(
  'BlobBackend',
  {
    requires: [ClientCapabilities.Client, WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
    provides: [FileCapabilities.Backend],
  },
  () => import('./blob-backend'),
);

export const Dependencies = Capability.lazyModule(
  'Dependencies',
  {
    requires: [ClientCapabilities.Client],
    provides: [WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
  },
  () => import('./dependencies'),
);
