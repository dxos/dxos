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
  // TODO(burdon): Document different implementations.
  readonly destroyed: boolean
  readonly filename: string
  readonly directory: string

  // Added by factory.
  readonly type: StorageType
  readonly native: RandomAccessStorage

  write(offset: number, data: Buffer): Promise<void>
  read(offset: number, size: number): Promise<Buffer>
  del(offset: number, size: number): Promise<void>
  stat(): Promise<FileStat>
  close(): Promise<Error>
  destroy(): Promise<Error>

  // Not supported in node, memory.
  truncate?(offset: number): Promise<void>

  // random-access-memory only.
  clone?(): RandomAccessStorage
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
 */
export const wrapFile = (
  native: RandomAccessStorage,
  type: StorageType
): File => {
  // NOTE: This is safe since these are interface methods only (not used internally).
  const file = pifyFields(native, type, [
    'write',
    'read',
    'del',
    'stat',
    'close',
    'destroy',
    'truncate'
  ]);

  {
    // Hack to make return type consistent on all environments
    const trueRead = file.read.bind(file);
    file.read = async (offset: number, data: Buffer) => {
      const readData = await trueRead(offset, data);
      return Buffer.from(readData);
    };
  }
  return Object.assign(file, {
    type,
    native
  });
};
