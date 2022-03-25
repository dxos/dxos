//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { Party } from '@dxos/client';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { useSelection } from '@dxos/react-client';
import { itemAdapter } from '@dxos/react-client-testing';
import { EchoGraphModel } from '@dxos/react-components';

// TODO(burdon): Accidentally test types are naturally alphabetical.
export const sortItems = (a: Item<ObjectModel>, b: Item<ObjectModel>) => {
  if (a.type! < b.type!) {
    return -1;
  }
  if (a.type! > b.type!) {
    return 1;
  }

  const ta = itemAdapter.title(a).toLowerCase();
  const tb = itemAdapter.title(b).toLowerCase();

  return (ta < tb) ? -1 : (ta > tb) ? 1 : 0;
};

/**
 * Filter items.
 */
export const useQuery = (party?: Party, query?: string): Item<ObjectModel>[] => {
  const text = query?.toLowerCase();
  const items = useSelection(party?.select()
    .filter(item => {
      if (!item.type?.startsWith('example:')) {
        return false;
      }

      if (!text) {
        return true;
      }

      const title = itemAdapter.title(item)?.toLowerCase();
      return title?.indexOf(text) !== -1;
    }),
  [text]
  ) ?? [];

  items.sort(sortItems);
  return items;
};

/**
 * Create model.
 */
export const useGraphModel = (party?: Party): EchoGraphModel => {
  const model = useMemo(() => new EchoGraphModel(), []);
  const items = useSelection(party?.select()) ?? [];

  useEffect(() => {
    // TODO(burdon): API should filter out root item.
    const filteredItems = items
      .filter(item => item.type?.startsWith('example:'));

    model.update(filteredItems);
  }, [items.length]);

  return model;
};
