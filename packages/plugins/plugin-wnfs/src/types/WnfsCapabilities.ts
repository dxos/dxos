//
// Copyright 2025 DXOS.org
//

// @import-as-namespace

import { type Blockstore as BlockstoreInterface } from 'interface-blockstore';
import { type PrivateDirectory, type PrivateForest } from 'wnfs';

import { Capability } from '@dxos/app-framework';
import { type SpaceId } from '@dxos/keys';

import { meta } from '#meta';

export const Blockstore = Capability.makeSingleton<BlockstoreInterface>()(`${meta.profile.key}.capability.blockstore`);

export type Instances = Record<SpaceId, { directory: PrivateDirectory; forest: PrivateForest }>;
export const Instances = Capability.makeSingleton<Instances>()(`${meta.profile.key}.capability.instances`);

/**
 * Name this extension registers its `BlobBackend` under on the ECHO Hypergraph. Core packages
 * (`@dxos/echo`, `@dxos/echo-client`, `@dxos/client`) never reference this constant.
 */
export const WNFS_BACKEND = 'wnfs';

/** URI scheme this extension's `BlobBackend` resolves at read time. */
export const WNFS_SCHEME = 'wnfs';
