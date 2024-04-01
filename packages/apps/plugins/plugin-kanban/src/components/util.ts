//
// Copyright 2023 DXOS.org
//

import { useEffect, useState } from 'react';

import { type KanbanColumnType } from '@braneframe/types';
import { createSubscription } from '@dxos/react-client/echo';
import { nonNullable } from '@dxos/util';

import { type Location } from '../types';

// TODO(burdon): Factor out.
export const useSubscription = (data: any) => {
  const [_, setIter] = useState([]);
  useEffect(() => {
    const handle = createSubscription(() => setIter([]));
    handle.update(data);
    return () => handle.unsubscribe();
  }, []);
};

/**
 * Find the column or item within the model.
 */
// TODO(burdon): Move to model.
export const findLocation = (columns: KanbanColumnType[], id: string): Location | undefined => {
  for (const column of columns) {
    // TODO(burdon): Need transient ID for UX.
    if (column.id === id) {
      return { column };
    } else {
      const idx = column.items.filter(nonNullable).findIndex((item) => item.id === id);
      if (idx !== -1) {
        return { column, item: column.items![idx], idx };
      }
    }
  }
};
