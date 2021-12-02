//
// Copyright 2020 DXOS.org
//

import { useEffect, useMemo, useState } from 'react';

import { PublicKey, PublicKeyLike } from '@dxos/crypto';
import { Party } from '@dxos/echo-db';

import { useClient } from '../client';
import { useResultSet } from '../util';

/**
 * Get a specific Party.
 * Requires ClientConext to be set via ClientProvider.
 */
export const useParty = (partyKey?: PublicKeyLike) => {
  const client = useClient();
  return partyKey ? client.echo.getParty(PublicKey.from(partyKey)) : undefined;
};

/**
 * Get all Parties available to current user.
 * Requires ClientConext to be set via ClientProvider.
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

/**
 * Get all known members of a Party.
 */
export const usePartyMembers = (party: Party) => {
  return useResultSet(useMemo(() => party.queryMembers(), [party.key.toHex()]));
};
