//
// Copyright 2026 DXOS.org
//

import { type Obj } from '@dxos/echo';

export type SelectHandle = {
  select: (object: Obj.Unknown) => void;
  /**
   * Report the dialog gone. Applied on a later task so that React StrictMode, which unmounts and
   * immediately remounts every effect in development, does not read as a dismissal: the remount calls
   * {@link SelectHandle.retain} first and takes it back.
   */
  dismiss: () => void;
  retain: () => void;
};

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
