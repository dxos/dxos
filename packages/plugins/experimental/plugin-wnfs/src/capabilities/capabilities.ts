//
// Copyright 2025 DXOS.org
//

import { defineCapability } from '@dxos/app-framework';

import { type MixedBlockstore } from '../blockstore';
import { WNFS_PLUGIN } from '../meta';

export namespace WnfsCapabilities {
  export const Blockstore = defineCapability<MixedBlockstore>(`${WNFS_PLUGIN}/capability/blockstore`);
}
