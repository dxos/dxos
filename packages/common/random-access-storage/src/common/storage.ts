//
// Copyright 2021 DXOS.org
//

import { Directory } from './directory';

// TODO(burdon): Reconcile with ConfigProto.
export enum StorageType {
  RAM = 'ram',
  IDB = 'idb',
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  NODE = 'node'
}

export interface Storage {
  readonly type: StorageType;
  readonly size: number;

  // TODO(burdon): Make required.
  createDirectory: (path?: string) => Directory;
  reset: () => Promise<void>;
}

export type StorageConstructor = (params?: { type?: StorageType; root?: string }) => Storage;
