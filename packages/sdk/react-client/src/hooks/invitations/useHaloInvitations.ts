//
// Copyright 2022 DXOS.org
//

import { Client, HaloProxy } from '@dxos/client';

import { useInvitations } from './useInvitations';

export const useHaloInvitations = (client: Client) =>
  useInvitations((client.halo as HaloProxy).invitationProxy);
