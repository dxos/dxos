//
// Copyright 2022 DXOS.org
//
import { File } from './File';

export interface Directory{
  /**
   * @internal
   */
  _close: () => Promise<void[]>

  /**
   * @internal
   */
   _destroy: () => Promise<void[]>

  createOrOpen: (filename: string, opts?: any) => File
  subDirectory: (path: string) => Directory
}
