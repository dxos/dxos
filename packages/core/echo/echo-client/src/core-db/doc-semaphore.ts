//
// Copyright 2024 DXOS.org
//

import { failedInvariant } from '@dxos/invariant';
import { log } from '@dxos/log';
import { getDebugName } from '@dxos/util';

// Not very pretty code, but easy to write without introducing a new wrapper around AM docs.

const beingChanged = new WeakSet<any>();

export const docChangeSemaphore = (handle: any) => {
  log('begin change', { handled: getDebugName(handle) });
  if (beingChanged.has(handle)) {
    failedInvariant('Recursive call to doc.change');
  }

  beingChanged.add(handle);

  return () => {
    log('end change', { handled: getDebugName(handle) });
    beingChanged.delete(handle);
  };
};
