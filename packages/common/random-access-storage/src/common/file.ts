//
// Copyright 2022 DXOS.org
//

import pify from 'pify';
import type { FileStat, RandomAccessStorage, RandomAccessStorageProperties } from 'random-access-storage';

import { log } from '@dxos/log';

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
      const fn = pify(object[field].bind(object));
      object[field] = async (...args: any) => {
        const before = performance.now();

        const res = await fn(...args);

        const elapsed = performance.now() - before;
        if (elapsed > 10) {
          log.warn('Slow storage operation', { type, operation: field, elapsed });
        }

        return res;
      };
    }
  }

  return object;
};

/**
 * Construct async File wrapper.
 * NOTE: This is safe since these are interface methods only (not used internally).
 */
export const wrapFile = (native: RandomAccessStorage, type: StorageType): File => {
  const file = pifyFields(native, type, ['write', 'read', 'del', 'stat', 'close', 'destroy', 'truncate']);

  return Object.assign(file, { type, native });
};
