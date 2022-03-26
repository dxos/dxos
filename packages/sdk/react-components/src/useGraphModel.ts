//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { Party } from '@dxos/client';
import { useSelection } from '@dxos/react-client';

import { EchoGraphModel } from './EchoGraph';

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
    // TODO(kaplanski): Check for array prop changes.
  }, [items.length]);

  return model;
};
