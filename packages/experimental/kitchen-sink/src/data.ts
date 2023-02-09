//
// Copyright 2022 DXOS.org
//

import { Space } from '@dxos/client';
import { DocumentModel } from '@dxos/document-model';
import { Item } from '@dxos/echo-db';
import { itemAdapter } from '@dxos/react-client-testing';

export const sortItems = (a: Item<DocumentModel>, b: Item<DocumentModel>) => {
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
export const useQuery = (space?: Space, query?: string): Item<DocumentModel>[] => {
  const text = query?.toLowerCase();
  // const items =
  //   useSelection(
  //     space?.select().filter((item) => {
  //       if (!item.type?.startsWith('example:')) {
  //         return false;
  //       }

  //       if (!text) {
  //         return true;
  //       }

  //       const title = itemAdapter.title(item)?.toLowerCase();
  //       return title?.indexOf(text) !== -1;
  //     })
  //   ) ?? [];

  // items.sort(sortItems);
  // return items;
  return null as any;
};
