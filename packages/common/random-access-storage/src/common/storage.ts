//
// Copyright 2021 DXOS.org
//

import { type Directory } from './directory';

// TODO(burdon): Reconcile with ConfigProto.
export enum StorageType {
  RAM = 'ram',
  IDB = 'idb',
  CHROME = 'chrome',
  FIREFOX = 'firefox',
  NODE = 'node',
  WEBFS = 'webfs',
}

export type DiskInfo = {
  /**
   * Bytes.
   */
  used: number;
};

export interface Storage {
  readonly path: string;
  readonly type: StorageType;
  readonly size: number;

  getDiskInfo?(): Promise<DiskInfo>;

  // TODO(burdon): Make required.
  createDirectory: (path?: string) => Directory;
  reset: () => Promise<void>;
}

export type StorageConstructor = (params?: { type?: StorageType; root?: string }) => Storage;
