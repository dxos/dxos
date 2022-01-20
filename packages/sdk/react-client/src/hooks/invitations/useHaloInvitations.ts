//
// Copyright 2022 DXOS.org
//

import { Client } from '@dxos/client';

import { useInvitations } from './useInvitations';

export const useHaloInvitations = (client: Client) => {
  return useInvitations(client.halo);
};
