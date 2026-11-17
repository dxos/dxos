//
// Copyright 2026 DXOS.org
//

import { type Database } from '@dxos/echo';
import { DatabaseImpl } from '@dxos/echo-client';
import { log } from '@dxos/log';

/**
 * Runs `call`, which starts another invocation in the caller's space, so that each reads the other's writes (edge
 * `docs/WORKING-SET.mdl`): the caller's writes are stored, which puts them in its working set, before the call; after
 * it, also when it failed, the caller re-reads its documents through `refresh` (a pull-only data plane's) and takes
 * the objects the callee wrote. Each step is best effort, as the working set is.
 */
export const handOffWorkingSet = async <T>(
  db: Database.Database | undefined,
  refresh: (() => Promise<void>) | undefined,
  call: () => Promise<T>,
): Promise<T> => {
  await db?.flush({ indexes: false }).catch((error) => log.warn('caller writes not stored before a call', { error }));
  try {
    return await call();
  } finally {
    await refresh?.().catch((error) => log.warn('caller documents not re-read after a call', { error }));
    if (db instanceof DatabaseImpl) {
      await db.absorbWorkingSet();
    }
  }
};
