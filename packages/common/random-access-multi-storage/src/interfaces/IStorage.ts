//
// Copyright 2021 DXOS.org
//

import { IFile } from './IFile';
import { StorageType } from './storage-types';

export interface IStorage {
  readonly type: StorageType

  createOrOpen: (filename: string, opts?: any) => IFile
  delete: (filename: string) => Promise<void>
  subDir (path: string): IStorage
  destroy: () => Promise<void>
}
