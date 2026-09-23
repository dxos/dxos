//
// Copyright 2024 DXOS.org
//

import { cbor } from '@automerge/automerge-repo';

import { invariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { type ProfileArchive, ProfileArchiveEntryType } from '@dxos/protocols';
import type { Storage } from '@dxos/random-access-storage';
import { arrayToBuffer } from '@dxos/util';

export const encodeProfileArchive = (profile: ProfileArchive): Uint8Array => cbor.encode(profile);

export const decodeProfileArchive = (data: Uint8Array): ProfileArchive => cbor.decode(data);

export const exportProfileData = async ({ storage }: { storage: Storage }): Promise<ProfileArchive> => {
  const archive: ProfileArchive = { storage: [], meta: { timestamp: new Date().toISOString() } };

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

  return archive;
};

export const importProfileData = async ({ storage }: { storage: Storage }, archive: ProfileArchive): Promise<void> => {
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
      case ProfileArchiveEntryType.KEY_VALUE:
        // Legacy LevelDB key/value entries are no longer supported (LevelDB was removed).
        log.warn('Skipping legacy KEY_VALUE entry (LevelDB storage removed)', { key: entry.key });
        break;
      case ProfileArchiveEntryType.SQLITE_DATABASE:
        log.warn('Skipping SQLITE_DATABASE entry (import via OPFS recovery API)', { key: entry.key });
        break;
      default:
        throw new Error(`Invalid entry type: ${entry.type}`);
    }
  }

  log.info('done importing files');
};
