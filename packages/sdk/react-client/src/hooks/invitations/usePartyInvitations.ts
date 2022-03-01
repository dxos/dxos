//
// Copyright 2022 DXOS.org
//

import { PublicKey } from '@dxos/crypto';

import { useParty } from '../echo-queries';
import { useInvitations } from './useInvitations';

export const usePartyInvitations = (partyKey?: PublicKey) => {
  const party = useParty(partyKey);
  return useInvitations(party?.invitationProxy);
};
