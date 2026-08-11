//
// Copyright 2026 DXOS.org
//

import { type Cursor } from '@dxos/link';

/** Read `syncBackDays` and `filter` from the binding options (opaque record). */
export const readBindingOptions = (binding: Cursor.ExternalCursor) => {
  const raw = binding.spec.options;
  if (!raw || typeof raw !== 'object') {
    return { syncBackDays: undefined as undefined | number, filter: undefined as undefined | string };
  }

  // Reject NaN/Infinity/negative — these feed `subDays`, which would otherwise yield an invalid date.
  const syncBackDays = raw.syncBackDays;
  return {
    syncBackDays:
      typeof syncBackDays === 'number' && Number.isFinite(syncBackDays) && syncBackDays >= 0 ? syncBackDays : undefined,
    filter: typeof raw.filter === 'string' ? raw.filter : undefined,
  };
};
