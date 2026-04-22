//
// Copyright 2025 DXOS.org
//

/** Delete all IndexedDB databases for this origin. */
export const clearIndexedDB = async (): Promise<void> => {
  const dbs = await indexedDB.databases();
  await Promise.all(
    dbs
      .filter((db) => db.name != null)
      .map(
        (db) =>
          new Promise<void>((resolve, reject) => {
            const request = indexedDB.deleteDatabase(db.name!);
            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
            request.onblocked = () => reject(new Error(`IndexedDB deletion blocked: ${db.name}`));
          }),
      ),
  );
};

/** Remove all entries from the Origin Private File System. */
export const clearOPFS = async (): Promise<void> => {
  const root = await navigator.storage.getDirectory();
  for await (const [name] of root.entries()) {
    await root.removeEntry(name, { recursive: true });
  }
};

/** Unregister all service workers for this origin. */
export const clearServiceWorkers = async (): Promise<void> => {
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const reg of regs) {
    await reg.unregister();
  }
};

/** Delete all HTTP caches for this origin. */
export const clearCaches = async (): Promise<void> => {
  const keys = await caches.keys();
  for (const key of keys) {
    await caches.delete(key);
  }
};
