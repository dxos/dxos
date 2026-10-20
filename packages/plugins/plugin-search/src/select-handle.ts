//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';

/**
 * The result handshake between `SearchOperation.SelectObject` and the search dialog it opens.
 *
 * The operation suspends until the handle settles exactly once: with the object picked, or with nothing
 * when the dialog went away. Escape, the overlay and the close button dismiss the dialog without reaching
 * any handler, so the dismissal is reported from the unmount cleanup.
 */
export type SelectHandle = {
  /** Settle with the object selected. Only the first settle counts. */
  select: (object: Obj.Unknown) => void;
  /**
   * Report the dialog gone. Applied on a later task so that React StrictMode, which unmounts and
   * immediately remounts every effect in development, does not read as a dismissal: the remount calls
   * {@link SelectHandle.retain} first and takes it back.
   */
  dismiss: () => void;
  /** Take back a pending {@link SelectHandle.dismiss}, because the dialog is still mounted. */
  retain: () => void;
};

/** Builds a handle over `onSettled`, called at most once with the object picked or `undefined`. */
export const makeSelectHandle = (onSettled: (object?: Obj.Unknown) => void): SelectHandle => {
  let pending: ReturnType<typeof setTimeout> | undefined;
  let settled = false;

  const settle = (object?: Obj.Unknown) => {
    if (settled) {
      return;
    }
    settled = true;
    clearTimeout(pending);
    pending = undefined;
    onSettled(object);
  };

  return {
    select: settle,
    dismiss: () => {
      if (!settled && pending === undefined) {
        pending = setTimeout(() => settle());
      }
    },
    retain: () => {
      clearTimeout(pending);
      pending = undefined;
    },
  };
};
