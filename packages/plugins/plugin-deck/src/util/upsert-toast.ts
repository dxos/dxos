//
// Copyright 2026 DXOS.org
//

import type * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';

/**
 * Adds a toast, replacing any live toast that shares its id. The toaster renders by `id` — it is the
 * React key, and `onDismissToast` matches on it — so appending a repeat id stacks two identical
 * toasts and collides the key. A repeat dispatch updates the live toast rather than opening a second.
 */
export const upsertToast = (
  toasts: readonly LayoutOperation.Toast[],
  toast: LayoutOperation.Toast,
): LayoutOperation.Toast[] => {
  const index = toasts.findIndex(({ id }) => id === toast.id);
  return index === -1 ? [...toasts, toast] : toasts.map((existing, current) => (current === index ? toast : existing));
};
