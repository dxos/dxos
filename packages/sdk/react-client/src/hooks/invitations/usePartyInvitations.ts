//
// Copyright 2022 DXOS.org
//

import { PartyProxy } from '@dxos/client';
import { PublicKey } from '@dxos/keys';

import { useParty } from '../echo-queries/index.js';
import { useInvitations } from './useInvitations.js';

export const usePartyInvitations = (partyKey?: PublicKey) => {
  const party = useParty(partyKey);
  return useInvitations((party as PartyProxy)?.invitationProxy);
};
