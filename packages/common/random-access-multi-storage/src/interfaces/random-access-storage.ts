//
// Copyright 2021 DXOS.org
//

import { IFile } from "./IFile";

export interface RandomAccessStorage {
  (file: string, opts?: {}): IFile;

  root: string;

  type: string;

  destroy(): Promise<void>;
}
