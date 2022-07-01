//
// Copyright 2021 DXOS.org
//

import { Directory } from './Directory';
import { StorageType } from './storage-types';

export interface Storage {
  readonly type: StorageType
  directory: (path?: string) => Directory
  destroy: () => Promise<void>
}
