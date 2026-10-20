//
// Copyright 2026 DXOS.org
//

import { useCallback } from 'react';

import * as Hooks from '@dxos/app-framework/Hooks';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { type Database, Filter } from '@dxos/echo';

/** Opens an object of the space by id in a plank beside `attendableId`, as following a link would. */
export const useOpenObject = (db: Database.Database | undefined, attendableId: string | undefined) => {
  const { invokePromise } = Hooks.useOperationInvoker();
  return useCallback(
    async (id: string) => {
      const [object] = db ? await db.query(Filter.id(id)).run() : [];
      if (object) {
        await invokePromise(LayoutOperation.Open, {
          subject: [GraphPath.getObjectPathFromObject(object)],
          pivotId: attendableId,
          disposition: 'add',
          navigation: 'immediate',
        });
      }
    },
    [db, attendableId, invokePromise],
  );
};
