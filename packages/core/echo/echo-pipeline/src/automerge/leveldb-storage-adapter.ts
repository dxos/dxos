//
// Copyright 2024 DXOS.org
//


import { type StorageAdapterInterface } from '@dxos/automerge/automerge-repo';

export type LevelDBStorageAdapterParams = {
  db: MySubLevel;
}

export class LevelDBStorageAdapter implements StorageAdapterInterface {
  constructor{private readonly _params: LevelDBStorageAdapterParams) {}

}
