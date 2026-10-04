//
// Copyright 2025 DXOS.org
//

// Each helper is a no-op where its API is absent (e.g. a WKWebView on a custom scheme has no service workers):
// there is nothing to clear.

/** Delete all IndexedDB databases for this origin. */
export const clearIndexedDB = async (): Promise<void> => {
  if (typeof indexedDB === 'undefined') {
    return;
  }
  const dbs = await indexedDB.databases();
  const results = await Promise.allSettled(
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
  const failures = results.filter((r): r is PromiseRejectedResult => r.status === 'rejected');
  if (failures.length > 0) {
    throw new AggregateError(
      failures.map((r) => r.reason),
      'Failed to delete some IndexedDB databases',
    );
  }
};

/** Remove all entries from the Origin Private File System. */
export const clearOPFS = async (): Promise<void> => {
  if (!globalThis.navigator?.storage?.getDirectory) {
    return;
  }
  const root = await navigator.storage.getDirectory();
  const errors: unknown[] = [];
  for await (const [name] of root.entries()) {
    try {
      await root.removeEntry(name, { recursive: true });
    } catch (err) {
      errors.push(err);
    }
  }
  if (errors.length > 0) {
    throw new AggregateError(errors, 'Failed to remove some OPFS entries');
  }
};

/** Unregister all service workers for this origin. */
export const clearServiceWorkers = async (): Promise<void> => {
  if (!globalThis.navigator?.serviceWorker) {
    return;
  }
  const regs = await navigator.serviceWorker.getRegistrations();
  for (const reg of regs) {
    await reg.unregister();
  }
};

/** Delete all HTTP caches for this origin. */
export const clearCaches = async (): Promise<void> => {
  if (typeof caches === 'undefined') {
    return;
  }
  const keys = await caches.keys();
  for (const key of keys) {
    await caches.delete(key);
  }
};
