import { log } from '@dxos/log';

/**
 * Deletes the data stored on disk based on the config provided.
 */
export async function resetStoredData(): Promise<void> {
  // TODO(dmaretskyi): Do we need to delete local storage?

  // Indexed DB.
  if (typeof indexedDB !== 'undefined') {
    const databases = await indexedDB.databases();
    for (const { name } of databases) {
      // Ignore settings stored in localforage.
      if (!name || name === 'localforage') {
        continue;
      }

      await deleteIdbDatabase(name);
    }
  }

  // OPFS.
  if (
    typeof navigator !== 'undefined' &&
    typeof navigator.storage !== 'undefined' &&
    typeof navigator.storage.getDirectory === 'function'
  ) {
    try {
      const root = await navigator.storage.getDirectory();
      for await (const entry of (root as any).keys() as Iterable<string>) {
        try {
          await root.removeEntry(entry, { recursive: true });
        } catch (err) {
          log.error('Failed to delete', { entry, err });
        }
      }
      log.info('Cleared OPFS');
    } catch (err) {
      log.catch(err);
    }
  }
}

const deleteIdbDatabase = async (name: string) => {
  try {
    log.info('Deleting indexedDB database', { name });
    const req = indexedDB.deleteDatabase(name);
    await new Promise<void>((resolve, reject) => {
      req.onsuccess = (e) => {
        log.info('onsuccess', { e });
        resolve();
      };
      req.onerror = reject;
    });
    log.info('Deleted indexedDB database', { name });
  } catch (err) {
    log.catch(err);
  }
};
