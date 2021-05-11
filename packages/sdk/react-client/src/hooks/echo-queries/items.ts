//
// Copyright 2020 DXOS.org
//

import { useState } from 'react';
import useDeepCompareEffect from 'use-deep-compare-effect';

import { PublicKey } from '@dxos/crypto';

import { useClient } from '../client';

export interface UseItemsProps {
  partyKey: PublicKey
}

export const useItems = ({ partyKey, ...filter }: UseItemsProps) => {
  const client = useClient();
  const party = client.echo.getParty(PublicKey.from(partyKey));
  const key = partyKey.toString();
  const [items, setItems] = useState<any[]>([]);

  if (!party) {
    throw new Error('Party not found.');
  }

  useDeepCompareEffect(() => {
    if (!party.isActive()) {
      return () => null;
    }
    const result = party.database.queryItems(filter);

    const unsubscribe = result.subscribe(() => {
      setItems(result.value);
    });
    setItems(result.value);

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [key, filter]);

  return items;
};
