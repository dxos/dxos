//
// Copyright 2021 DXOS.org
//

import { IFile } from "./IFile";

export interface IStorage {
  readonly type: string

  createOrOpen: (filename: string) => Promise<IFile>
  delete: (filename: string) => Promise<void>
  subDir (path: string): IStorage
  destroy: () => Promise<void>
}
