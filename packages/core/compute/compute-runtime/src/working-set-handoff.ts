//
// Copyright 2026 DXOS.org
//

import { type Database } from '@dxos/echo';
import { DatabaseImpl } from '@dxos/echo-client';
import { log } from '@dxos/log';

/**
 * Runs `call`, a nested invocation in the caller's space, so each reads the other's writes: the caller snapshots its
 * working set first, and afterwards re-reads its documents through `refresh` and takes the working set again.
 */
export const handOffWorkingSet = async <T>(
  db: Database.Database | undefined,
  refresh: (() => Promise<void>) | undefined,
  call: () => Promise<T>,
): Promise<T> => {
  if (db instanceof DatabaseImpl) {
    await db.saveWorkingSet();
  } else {
    await db?.flush({ indexes: false }).catch((error) => log.warn('caller writes not stored before a call', { error }));
  }
  try {
    return await call();
  } finally {
    await refresh?.().catch((error) => log.warn('caller documents not re-read after a call', { error }));
    if (db instanceof DatabaseImpl) {
      await db.absorbWorkingSet();
    }
  }
};
