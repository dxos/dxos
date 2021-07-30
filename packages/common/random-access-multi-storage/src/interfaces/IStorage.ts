//
// Copyright 2021 DXOS.org
//

import { StorageType } from "../implementations/storage-types";
import { IFile } from "./IFile";

export interface IStorage {
  readonly type: StorageType

  createOrOpen: (filename: string) => IFile
  delete: (filename: string) => Promise<void>
  subDir (path: string): IStorage
  destroy: () => Promise<void>
}
