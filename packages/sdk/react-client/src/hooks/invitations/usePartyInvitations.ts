//
// Copyright 2022 DXOS.org
//

import { PartyProxy } from '@dxos/client';
import { PublicKey } from '@dxos/keys';

import { useParty } from '../echo-queries';
import { useInvitations } from './useInvitations';

export const usePartyInvitations = (partyKey?: PublicKey) => {
  const party = useParty(partyKey);
  return useInvitations((party as PartyProxy)?.invitationProxy);
};
