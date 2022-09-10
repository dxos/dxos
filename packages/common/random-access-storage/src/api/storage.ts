//
// Copyright 2021 DXOS.org
//

import { Directory } from './directory';

export enum StorageType {
  RAM = 'ram',
  IDB = 'idb',
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  NODE = 'node'
}

export interface Storage {
  readonly type: StorageType
  directory: (path?: string) => Directory
  destroy: () => Promise<void>
}

export type StorageConstructor = (root: string, type?: StorageType) => Storage
