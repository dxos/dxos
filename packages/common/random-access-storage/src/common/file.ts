//
// Copyright 2022 DXOS.org
//

import pify from 'pify';
import type {
  FileStat,
  RandomAccessStorage,
  RandomAccessStorageProperties
} from 'random-access-storage';

import { StorageType } from './storage';

/**
 * Random access file wrapper.
 * https://github.com/random-access-storage/random-access-storage
 */
export interface File extends RandomAccessStorageProperties {
  readonly destroyed: boolean;

  // TODO(burdon): Can we remove these since they are not standard across implementations?
  readonly directory: string;
  readonly filename: string;

  // Added by factory.
  readonly type: StorageType;
  readonly native: RandomAccessStorage;

  write(offset: number, data: Buffer): Promise<void>;
  read(offset: number, size: number): Promise<Buffer>;
  del(offset: number, size: number): Promise<void>;
  stat(): Promise<FileStat>;
  close(): Promise<Error>;
  destroy(): Promise<Error>;

  // Not supported in node, memory.
  truncate?(offset: number): Promise<void>;

  // random-access-memory only.
  clone?(): RandomAccessStorage;
}

const pifyFields = (object: any, type: StorageType, fields: string[]) => {
  for (const field of fields) {
    if (!object[field]) {
      // TODO(burdon): Suppress warning and throw error if used.
      // console.warn(`Field not supported for type: ${JSON.stringify({ type, field })}`);
    } else {
      object[field] = pify(object[field].bind(object));
    }
  }

  return object;
};

/**
 * Construct async File wrapper.
 * NOTE: This is safe since these are interface methods only (not used internally).
 */
export const wrapFile = (
  native: RandomAccessStorage,
  type: StorageType
): File => {
  const file = pifyFields(native, type, [
    'write',
    'read',
    'del',
    'stat',
    'close',
    'destroy',
    'truncate'
  ]);

  return Object.assign(file, { type, native });
};
