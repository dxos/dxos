//
// Copyright 2025 DXOS.org
//

/** Delete all IndexedDB databases for this origin. */
export const clearIndexedDB = async (): Promise<void> => {
  try {
    const dbs = await indexedDB.databases();
    for (const db of dbs) {
      indexedDB.deleteDatabase(db.name ?? '');
    }
  } catch (err) {
    console.error('Failed to clear IndexedDB', err);
  }
};

/** Remove all entries from the Origin Private File System. */
export const clearOPFS = async (): Promise<void> => {
  try {
    const root = await navigator.storage.getDirectory();
    for await (const [name] of root.entries()) {
      await root.removeEntry(name, { recursive: true });
    }
  } catch (err) {
    console.error('Failed to clear OPFS', err);
  }
};

/** Unregister all service workers for this origin. */
export const clearServiceWorkers = async (): Promise<void> => {
  try {
    const regs = await navigator.serviceWorker.getRegistrations();
    for (const reg of regs) {
      await reg.unregister();
    }
  } catch (err) {
    console.error('Failed to clear service workers', err);
  }
};

/** Delete all HTTP caches for this origin. */
export const clearCaches = async (): Promise<void> => {
  try {
    const keys = await caches.keys();
    for (const key of keys) {
      await caches.delete(key);
    }
  } catch (err) {
    console.error('Failed to clear caches', err);
  }
};
