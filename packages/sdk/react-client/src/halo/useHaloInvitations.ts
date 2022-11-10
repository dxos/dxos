//
// Copyright 2022 DXOS.org
//

import { useMemo, useState } from 'react';

import { InvitationObservable } from '@dxos/client';

import { useInvitationStatus } from '../invitations';

// import { useClient } from '../client';

export const useHaloInvitations = (): InvitationObservable[] => {
  // const client = useClient();
  const [invitations, _setInvitations] = useState<InvitationObservable[]>([]);

  // useEffect(() => {
  //   return client.halo.invitationsUpdate.on(() => {
  //     setInvitations(client.halo.invitations);
  //   });
  // }, []);

  return invitations;
};

export const useHaloInvitation = (invitationId?: string) => {
  const invitations = useHaloInvitations();
  const invitation = useMemo(
    () => invitations.find(({ invitation }) => invitation?.invitationId === invitationId),
    [invitations]
  );
  return useInvitationStatus(invitation);
};
