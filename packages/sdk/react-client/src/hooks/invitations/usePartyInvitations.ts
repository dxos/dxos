//
// Copyright 2022 DXOS.org
//

import { useEffect, useState } from 'react';

import { InvitationRequest } from '@dxos/client';
import { PublicKey } from '@dxos/crypto';

import { useParty } from '../echo-queries';

export const usePartyInvitations = (partyKey?: PublicKey) => {
  const party = useParty(partyKey);
  const [invitations, setInvitations] = useState<InvitationRequest[]>(party?.activeInvitations ?? []);

  useEffect(() => {
    if (!party) {
      return;
    }
    return party.invitationsUpdate.on(() => {
      setInvitations([...party.activeInvitations]);
    });
  }, [party]);

  useEffect(() => {
    setInvitations([]);
  }, [party?.key.toHex()]);

  return invitations;
};
