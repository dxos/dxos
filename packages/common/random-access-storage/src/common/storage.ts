//
// Copyright 2021 DXOS.org
//

import { type Directory } from './directory.ts';

// TODO(burdon): Reconcile with ConfigProto.
export enum StorageType {
  RAM = 'ram',
  IDB = 'idb',
  /**
   * @deprecated Use `IDB`; it is handled identically.
   */
  CHROME = 'chrome',
  /**
   * @deprecated Use `IDB`; it is handled identically.
   */
  FIREFOX = 'firefox',
  NODE = 'node',
  /**
   * @deprecated Use `IDB`.
   */
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
  close: () => Promise<void>;
}

export type StorageConstructor = (params?: { type?: StorageType; root?: string }) => Storage;
