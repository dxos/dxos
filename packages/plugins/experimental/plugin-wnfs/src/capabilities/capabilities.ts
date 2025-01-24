//
// Copyright 2025 DXOS.org
//

import { type PrivateDirectory, type PrivateForest } from 'wnfs';

import { defineCapability } from '@dxos/app-framework';
import { type SpaceId } from '@dxos/keys';

import { type MixedBlockstore } from '../blockstore';
import { WNFS_PLUGIN } from '../meta';

export namespace WnfsCapabilities {
  export const Blockstore = defineCapability<MixedBlockstore>(`${WNFS_PLUGIN}/capability/blockstore`);

  export type Instances = Record<SpaceId, { directory: PrivateDirectory; forest: PrivateForest }>;
  export const Instances = defineCapability<Instances>(`${WNFS_PLUGIN}/capability/instances`);
}
