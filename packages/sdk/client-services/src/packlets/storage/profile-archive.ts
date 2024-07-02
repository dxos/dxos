//
// Copyright 2024 DXOS.org
//

import { cbor } from '@dxos/automerge/automerge-repo';
import { invariant } from '@dxos/invariant';
import type { LevelDB } from '@dxos/kv-store';
import { log } from '@dxos/log';
import { ProfileArchiveEntryType, type ProfileArchive } from '@dxos/protocols';
import type { Storage } from '@dxos/random-access-storage';
import { arrayToBuffer } from '@dxos/util';

export const encodeProfileArchive = (profile: ProfileArchive): Uint8Array => cbor.encode(profile);

export const decodeProfileArchive = (data: Uint8Array): ProfileArchive => cbor.decode(data);

export const exportProfileData = async ({
  storage,
  level,
}: {
  storage: Storage;
  level: LevelDB;
}): Promise<ProfileArchive> => {
  const archive: ProfileArchive = { storage: [], meta: { timestamp: new Date().toISOString() } };

  {
    const directory = await storage.createDirectory();
    const files = await directory.list();

    log.info('begin exporting files', { count: files.length });
    for (const filename of files) {
      const file = await directory.getOrCreateFile(filename);
      const { size } = await file.stat();
      const data = await file.read(0, size);
      archive.storage.push({
        type: ProfileArchiveEntryType.FILE,
        key: filename,
        value: data,
      });
    }
    log.info('done exporting files', { count: files.length });
  }

  {
    log.info('begin exporting kv pairs');
    const iter = await level.iterator<Uint8Array, Uint8Array>({ keyEncoding: 'binary', valueEncoding: 'binary' });
    let count = 0;
    for await (const [key, value] of iter) {
      archive.storage.push({
        type: ProfileArchiveEntryType.KEY_VALUE,
        key,
        value,
      });
      count++;
    }
    log.info('done exporting kv pairs', { count });
  }

  return archive;
};

export const importProfileData = async (
  {
    storage,
    level,
  }: {
    storage: Storage;
    level: LevelDB;
  },
  archive: ProfileArchive,
): Promise<void> => {
  let batch = level.batch();

  let count = 0;
  for (const entry of archive.storage) {
    switch (entry.type) {
      case ProfileArchiveEntryType.FILE: {
        const directory = await storage.createDirectory();
        invariant(typeof entry.key === 'string', 'Invalid key type');
        const file = await directory.getOrCreateFile(entry.key);
        invariant(entry.value instanceof Uint8Array, 'Invalid value type');
        await file.write(0, arrayToBuffer(entry.value));
        await file.close();
        break;
      }
      case ProfileArchiveEntryType.KEY_VALUE: {
        invariant(entry.key instanceof Uint8Array, 'Invalid key type');
        invariant(entry.value instanceof Uint8Array, 'Invalid value type');
        batch.put(entry.key, entry.value, { keyEncoding: 'binary', valueEncoding: 'binary' });
        break;
      }
      default:
        throw new Error(`Invalid entry type: ${entry.type}`);
    }

    if (++count % 1000 === 0) {
      // Apparently indexedDB can't handle big batches.
      await batch.write();
      batch = level.batch();

      log.info('importing', {
        count,
        total: archive.storage.length,
        progress: `${((count / archive.storage.length) * 100).toFixed()}%`,
      });
    }
  }

  log.info('committing changes..');
  await batch.write();
};
