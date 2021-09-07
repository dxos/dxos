//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { PublicKey, PublicKeyLike } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';

import { useClient } from '../client';

/**
 * Get a specific Party.
 * To be used with `ClientProvider` or `ClientInitializer` component wrapper.
 */
export const useParty = (partyKey?: PublicKeyLike) => {
  const client = useClient();
  return partyKey ? client.echo.getParty(PublicKey.from(partyKey)) : undefined;
};

/**
 * Get all Parties available to current user.
 * To be used with `ClientProvider` or `ClientInitializer` component wrapper.
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
