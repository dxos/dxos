//
// Copyright 2020 DXOS.org
//

import { useEffect, useState } from 'react';

import { PartyProxy } from '@dxos/client';
import { PublicKeyLike } from '@dxos/crypto';

import { useClient } from '../client';

/**
 * Get a specific Party.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useParty = (partyKey?: PublicKeyLike): PartyProxy | undefined => {
  const parties = useParties();
  return parties.find(party => partyKey && party.key.equals(partyKey));
};

/**
 * Get all Parties available to current user.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useParties = () => {
  const client = useClient();
  const [parties, setParties] = useState<PartyProxy[]>([]);

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
