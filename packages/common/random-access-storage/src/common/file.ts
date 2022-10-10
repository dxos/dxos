//
// Copyright 2022 DXOS.org
//

import pify from 'pify';

import type { FileStat, RandomAccessFile, RandomAccessStorageProperties } from '../types';
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
  readonly native: RandomAccessFile

  write (offset: number, data: Buffer): Promise<void>
  read (offset: number, size: number): Promise<Buffer>
  del (offset: number, size: number): Promise<void>
  stat (): Promise<FileStat>
  close (): Promise<Error>
  destroy (): Promise<Error>

  // Not supported in node, memory.
  truncate? (offset: number): Promise<void>

  // random-access-memory only.
  clone? (): RandomAccessFile
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
export const wrapFile = (native: RandomAccessFile, type: StorageType): File => {
  const file = pifyFields(native, type, ['write', 'read', 'del', 'stat', 'close', 'destroy', 'truncate']);
  return Object.assign(file, {
    type,
    native
  });
};
