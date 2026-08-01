//
// Copyright 2025 DXOS.org
//

import * as Capability from '@dxos/app-framework/Capability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { FileCapabilities, FileEvents } from '@dxos/plugin-file/types';

import { WnfsCapabilities, WnfsEvents } from '#types';

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
    provides: [WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
    activatesOn: WnfsEvents.Start,
  },
  () => import('./dependencies'),
);
