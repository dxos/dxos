//
// Copyright 2025 DXOS.org
//

import { type Blockstore } from 'interface-blockstore';
import { type PrivateDirectory, type PrivateForest } from 'wnfs';

import { defineCapability } from '@dxos/app-framework';
import { type SpaceId } from '@dxos/keys';

import { meta } from '../meta';

export namespace WnfsCapabilities {
  export const Blockstore = defineCapability<Blockstore>(`${meta.id}/capability/blockstore`);

  export type Instances = Record<SpaceId, { directory: PrivateDirectory; forest: PrivateForest }>;
  export const Instances = defineCapability<Instances>(`${meta.id}/capability/instances`);
}
