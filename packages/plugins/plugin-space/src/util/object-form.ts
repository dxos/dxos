//
// Copyright 2026 DXOS.org
//

import { type Obj, Ref } from '@dxos/echo';

/**
 * The result handshake between `SpaceOperation.OpenObjectForm` and the dialog it opens.
 *
 * The operation suspends until the handle settles exactly once: with the object the user confirmed,
 * or with nothing when the dialog went away. Escape, the overlay, and the close affordance dismiss
 * the dialog without reaching any handler, so the dismissal is reported from the unmount cleanup
 * rather than from a cancel button — which is also why the two calls around it exist.
 */
export type ObjectFormHandle = {
  /** Settle, with the confirmed object or with nothing. Only the first call counts. */
  settle: (object?: Obj.Unknown) => void;
  /**
   * Report the dialog gone. Applied on a later task so that React StrictMode, which unmounts and
   * immediately remounts every effect in development, does not read as a cancel — the remount calls
   * {@link ObjectFormHandle.retain} first and takes the dismissal back.
   */
  dismiss: () => void;
  /** Take back a pending {@link ObjectFormHandle.dismiss}, because the dialog is still mounted. */
  retain: () => void;
  /**
   * Note that a confirm is under way, so the unmount the confirm itself triggers is not a dismissal.
   * A draft is built after the dialog has closed, so its {@link ObjectFormHandle.settle} lands later
   * than the unmount does.
   */
  confirm: () => void;
};

/**
 * Builds a handle over `onSettled`, which is called at most once with the confirmed object's
 * reference or `undefined` for a dismissal.
 */
export const makeObjectFormHandle = (onSettled: (result?: Ref.Ref<Obj.Unknown>) => void): ObjectFormHandle => {
  let pending: ReturnType<typeof setTimeout> | undefined;
  let confirming = false;
  let settled = false;

  const clearPending = () => {
    if (pending !== undefined) {
      clearTimeout(pending);
      pending = undefined;
    }
  };

  return {
    settle: (object) => {
      if (settled) {
        return;
      }
      settled = true;
      clearPending();
      onSettled(object && Ref.make(object));
    },
    dismiss: () => {
      if (confirming || settled || pending !== undefined) {
        return;
      }
      pending = setTimeout(() => {
        pending = undefined;
        if (!settled) {
          settled = true;
          onSettled(undefined);
        }
      });
    },
    retain: clearPending,
    confirm: () => {
      confirming = true;
      clearPending();
    },
  };
};
