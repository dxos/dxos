//
// Copyright 2022 DXOS.org
//

import { PartyProxy } from '@dxos/client';
import { PublicKey } from '@dxos/keys';

import { useParty } from '../echo-queries';
import { useInvitations } from './useInvitations';

export const usePartyInvitations = (spaceKey?: PublicKey) => {
  const party = useParty(spaceKey);
  return useInvitations((party as PartyProxy)?.invitationProxy);
};
