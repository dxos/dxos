//
// Copyright 2021 DXOS.org
//

import { File } from './File';
import { StorageType } from './storage-types';

export interface IStorage {
  readonly type: StorageType

  createOrOpen: (filename: string, opts?: any) => File
  delete: (filename: string) => Promise<void>
  subDir (path: string): IStorage
  destroy: () => Promise<void>
}
