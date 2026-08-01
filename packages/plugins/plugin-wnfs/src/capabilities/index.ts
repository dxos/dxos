//
// Copyright 2025 DXOS.org
//

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import { ClientCapabilities } from '@dxos/plugin-client';
import { FileCapabilities } from '@dxos/plugin-file/types';

import { WnfsCapabilities } from '#types';

export const BlobBackend = Capability.lazyModule(
  'BlobBackend',
  {
    requires: [ClientCapabilities.Client, WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
    provides: [FileCapabilities.Backend],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./blob-backend'),
);

export const Dependencies = Capability.lazyModule(
  'Dependencies',
  {
    requires: [ClientCapabilities.Client],
    provides: [WnfsCapabilities.Blockstore, WnfsCapabilities.Instances],
    activatesOn: ActivationEvents.DeferredStartup,
  },
  () => import('./dependencies'),
);
