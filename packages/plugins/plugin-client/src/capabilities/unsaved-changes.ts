//
// Copyright 2026 DXOS.org
//

import { type Space } from '@dxos/client/echo';

/** The part of a client these helpers read. */
export type UnsavedChangesClient = {
  readonly spaces: { get(): readonly { readonly db: Pick<Space['db'], 'hasUnsavedChanges' | 'flush'> }[] };
};

/** How long a reload waits for unsaved changes to reach the worker before giving up on them. */
const SAVE_TIMEOUT = 30_000;

/** Whether any space holds a change only this page has, which leaving the page would lose. */
export const hasUnsavedChanges = (client: UnsavedChangesClient): boolean =>
  client.spaces.get().some((space) => space.db.hasUnsavedChanges());

/** Hands every unsaved change to the worker, resolving whether none is left. A flush that never settles is given up on. */
export const saveUnsavedChanges = async (client: UnsavedChangesClient, timeout = SAVE_TIMEOUT): Promise<boolean> => {
  if (!hasUnsavedChanges(client)) {
    return true;
  }
  const flushed = Promise.allSettled(
    client.spaces.get().map((space) => space.db.flush({ disk: true, indexes: false })),
  );
  let timer: ReturnType<typeof setTimeout> | undefined;
  await Promise.race([flushed, new Promise((resolve) => (timer = setTimeout(resolve, timeout)))]);
  clearTimeout(timer);
  return !hasUnsavedChanges(client);
};

/**
 * Asks before the page unloads while a change exists only here. `beforeunload` must decide
 * synchronously, so it can only ask; app-initiated reloads save first.
 */
export const guardUnload = (client: UnsavedChangesClient): (() => void) => {
  const onBeforeUnload = (event: BeforeUnloadEvent) => {
    if (hasUnsavedChanges(client)) {
      event.preventDefault();
      // WebKit asks only when `returnValue` is set.
      event.returnValue = '';
    }
  };
  globalThis.addEventListener?.('beforeunload', onBeforeUnload);
  return () => globalThis.removeEventListener?.('beforeunload', onBeforeUnload);
};
