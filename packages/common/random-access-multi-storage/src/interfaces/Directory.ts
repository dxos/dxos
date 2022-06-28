//
// Copyright 2022 DXOS.org
//
import { File } from './File';

export interface Directory{
  /**
   * @internal
   */
  _closeFiles: () => Promise<void[]>

  createOrOpen: (filename: string, opts?: any) => File
  directory: (path: string) => Directory
}