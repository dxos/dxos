//
// Copyright 2022 DXOS.org
//

import { useEffect, useMemo } from 'react';

import { Item, Space } from '@dxos/client';
import { useSelection } from '@dxos/react-client';

import { EchoGraphModel } from '../components';

// TODO(kaplanski): Separate selection api filters from post query filters?
/**
 * Create model.
 */
export const useGraphModel = (space?: Space, filters: ((item: Item<any>) => boolean)[] = []): EchoGraphModel => {
  const model = useMemo(() => new EchoGraphModel(), []);
  const items = useSelection(space?.select()) ?? [];

  useEffect(() => {
    // TODO(burdon): API should filter out root item.
    const filteredItems = items.filter((item) => filters.every((filter) => filter(item)));

    model.update(filteredItems);
    // TODO(kaplanski): Check for array prop changes.
  }, [items.length]);

  return model;
};
