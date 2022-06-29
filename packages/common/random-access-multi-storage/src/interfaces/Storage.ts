//
// Copyright 2021 DXOS.org
//

import { Directory } from './Directory';
import { File } from './File';
import { StorageType } from './storage-types';

export interface Storage {
  readonly type: StorageType

  /**
   * @internal
   */
  _getFileIfExists: (path:string) => File | null

  /**
   * @internal
   */
  _addFile: (path:string, file: File) => void

  directory: (path?: string) => Directory
  destroy: () => Promise<void>
}
