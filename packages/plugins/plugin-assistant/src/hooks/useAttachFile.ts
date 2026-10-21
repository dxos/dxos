//
// Copyright 2026 DXOS.org
//

import { useCallback, useMemo } from 'react';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Hooks from '@dxos/app-framework/Hooks';
import { type Database, type Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import * as FileOperation from '@dxos/plugin-file/FileOperation';
import * as SpaceOperation from '@dxos/plugin-space/SpaceOperation';

/**
 * Stores a browser file as a `File` object in `db`, filed where a file belongs (the space's root collection) as any
 * other added file is, resolving to the one stored and rejecting with why it could not be, or with the abort reason
 * when `signal` gives up on it before it is filed. Undefined when no plugin
 * handles `FileOperation.Create`: a host may run the assistant without plugin-file, and a file it cannot store must
 * not be offered at all.
 */
export const useAttachFile = (
  db: Database.Database | undefined,
): ((file: globalThis.File, signal?: AbortSignal) => Promise<Obj.Unknown>) | undefined => {
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
    async (file: globalThis.File, signal?: AbortSignal) => {
      invariant(db);
      const created = await invokePromise(FileOperation.Create, { db, file });
      if (created.error || !created.data) {
        throw created.error ?? new Error(`${file.name} could not be stored.`);
      }
      signal?.throwIfAborted();
      const added = await invokePromise(
        SpaceOperation.AddObject,
        { object: created.data.object },
        { spaceId: db.spaceId },
      );
      if (added.error || !added.data) {
        throw added.error ?? new Error(`${file.name} could not be stored.`);
      }
      return added.data.object;
    },
    [db, invokePromise],
  );

  return canCreateFiles && db ? attach : undefined;
};
