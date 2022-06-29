//
// Copyright 2022 DXOS.org
//
import { File } from './File';

export interface Directory{
  createOrOpen: (filename: string, opts?: any) => File
  subDirectory: (path: string) => Directory
}
