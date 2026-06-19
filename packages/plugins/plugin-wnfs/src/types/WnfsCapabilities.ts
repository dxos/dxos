//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Blockstore as BlockstoreInterface } from 'interface-blockstore';
import { type PrivateDirectory, type PrivateForest } from 'wnfs';

import { Capability } from '@dxos/app-framework';
import { type SpaceId } from '@dxos/keys';

import { meta } from '#meta';

export const Blockstore = Capability.make<BlockstoreInterface>(`${meta.profile.key}.capability.blockstore`);

export type Instances = Record<SpaceId, { directory: PrivateDirectory; forest: PrivateForest }>;
export const Instances = Capability.make<Instances>(`${meta.profile.key}.capability.instances`);
