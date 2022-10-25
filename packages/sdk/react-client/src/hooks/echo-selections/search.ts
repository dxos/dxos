//
// Copyright 2020 DXOS.org
//

import { Party } from '@dxos/client';

import { useSelection } from './useSelection';

/**
 * A Selector used for finding items based on a search pattern.
 * @param party
 * @param search Searched value.
 */
// TODO(burdon): Create index.
// TODO(dmaretskyi): Why is this in react-client?
export const useSearchSelection = (party: Party, search: any) => {
  const match = (pattern: any, text: any) => {
    if (!pattern) {
      return true;
    }

    if (!text) {
      return false;
    }

    // TODO(burdon): Prefix match.
    return text.toLowerCase().indexOf(pattern) !== -1;
  };

  return useSelection(
    party.select().filter((item) => {
      // TODO(burdon): Filter types.
      if (item.type?.indexOf('example') === -1) {
        return false;
      }

      // TODO(burdon): Generalize.
      const text = item.model.get('name');
      return match(search, text);
    }),
    [search]
  );
};
