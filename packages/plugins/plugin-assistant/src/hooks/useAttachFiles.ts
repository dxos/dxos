//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import { type Database, type Obj } from '@dxos/echo';
import { log } from '@dxos/log';
import * as FileOperation from '@dxos/plugin-file/FileOperation';

/**
 * Stores browser files as `File` objects in `db`, resolving to the ones stored. Undefined when no plugin
 * handles `FileOperation.Create`: a host may run the assistant without plugin-file, and a file it cannot
 * store must not be offered at all.
 */
export const useAttachFiles = (
  db: Database.Database | undefined,
): ((files: readonly globalThis.File[]) => Promise<Obj.Unknown[]>) | undefined => {
  const { invokePromise } = Hooks.useOperationInvoker();
  const handlerSets = Hooks.useCapabilities(Capabilities.OperationHandler);
  const canCreateFiles = useMemo(
    () =>
      handlerSets.some((set) =>
        set.definitions().some((definition) => definition.meta.key === FileOperation.Create.meta.key),
      ),
    [handlerSets],
  );

  const attach = useCallback(
    async (files: readonly globalThis.File[]) => {
      if (!db) {
        return [];
      }
      const stored: Obj.Unknown[] = [];
      for (const file of files) {
        const { data, error } = await invokePromise(FileOperation.Create, { db, file });
        if (error || !data) {
          log.warn('file rejected', { name: file.name, type: file.type, error });
          continue;
        }
        stored.push(db.add(data.object));
      }
      return stored;
    },
    [db, invokePromise],
  );

  return canCreateFiles && db ? attach : undefined;
};
