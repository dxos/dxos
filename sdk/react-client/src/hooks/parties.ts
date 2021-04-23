//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { PublicKey } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';

import { useClient } from './client';

/**
 * Get party.
 */
export const useParty = (partyKey: Uint8Array) => {
  const client = useClient();
  return partyKey ? client.echo.getParty(PublicKey.from(partyKey)) : undefined;
};

/**
 * Get parties.
 */
export const useParties = () => {
  const client = useClient();
  const [parties, setParties] = useState<Party[]>([]);

  useEffect(() => {
    const result = client.echo.queryParties();
    setParties(result.value);

    const unsubscribe = result.subscribe(() => {
      setParties(result.value);
    });

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, []);

  return parties;
};
