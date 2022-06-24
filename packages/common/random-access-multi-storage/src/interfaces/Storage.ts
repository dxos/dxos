//
// Copyright 2021 DXOS.org
//

import { File } from './File';
import { StorageType } from './storage-types';

// TODO(dmaretskyi): Rename to Storage.
export interface Storage {
  readonly type: StorageType

  createOrOpen: (filename: string, opts?: any) => File
  delete: (filename: string) => Promise<void>
  subDir (path: string): Storage
  destroy: () => Promise<void>
}
