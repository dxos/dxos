//
// Copyright 2022 DXOS.org
//

import { Party } from '@dxos/client';
import { Item } from '@dxos/echo-db';
import { ObjectModel } from '@dxos/object-model';
import { useSelection } from '@dxos/react-client';
import { itemAdapter } from '@dxos/react-client-testing';

export const sortItems = (a: Item<ObjectModel>, b: Item<ObjectModel>) => {
  if (a.type! < b.type!) {
    return -1;
  }
  if (a.type! > b.type!) {
    return 1;
  }

  const ta = itemAdapter.title(a)?.toLowerCase();
  if (!ta) {
    return -1;
  }

  const tb = itemAdapter.title(b)?.toLowerCase();
  if (!tb) {
    return 1;
  }

  return ta < tb ? -1 : ta > tb ? 1 : 0;
};

/**
 * Filter items.
 */
export const useQuery = (party?: Party, query?: string): Item<ObjectModel>[] => {
  const text = query?.toLowerCase();
  const items =
    useSelection(
      party?.select().filter((item) => {
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
