//
// Copyright 2026 DXOS.org
//

import * as SqlClient from 'effect/unstable/sql/SqlClient';

import * as LayerSpec from '@dxos/compute/LayerSpec';
import {
  HypercoreFactoryLayer,
  HypercoreFactoryService,
  HypercoreStorageDirectoryService,
  HypercoreStoreLayer,
  HypercoreStoreService,
} from '@dxos/feed-store';
import { KeyringApiService, SqliteKeyringLayer } from '@dxos/keyring';

import { valueEncoding } from './pipeline/index.ts';

//
// Layers the kernel pulls in from the wider monorepo: the keyring and the hypercore feed store.
//

export const KeyringSpec = LayerSpec.make(
  { affinity: 'application', requires: [SqlClient.SqlClient], provides: [KeyringApiService] },
  () => SqliteKeyringLayer(),
);

export const HypercoreFactorySpec = LayerSpec.make(
  {
    affinity: 'application',
    requires: [KeyringApiService, HypercoreStorageDirectoryService],
    provides: [HypercoreFactoryService],
  },
  () => HypercoreFactoryLayer({ hypercore: { valueEncoding, stats: true } }),
);

export const HypercoreStoreSpec = LayerSpec.make(
  { affinity: 'application', requires: [HypercoreFactoryService], provides: [HypercoreStoreService] },
  () => HypercoreStoreLayer(),
);
