//
// Copyright 2020 DXOS.org
//

import { useEffect, useSyncExternalStore } from 'react';

import { IFrameClientServicesHost, IFrameClientServicesProxy, ShellLayout } from '@dxos/client';

import { useClient } from '../client';

/**
 * Hook returning DXOS identity object.
 * Requires ClientContext to be set via ClientProvider.
 */
export const useIdentity = (options?: { login?: boolean }) => {
  const { login } = { login: false, ...options };

  const client = useClient();
  const identity = useSyncExternalStore(
    (listener) => {
      const subscription = client.halo.identity.subscribe(listener);
      return () => subscription.unsubscribe();
    },
    () => client.halo.identity.get(),
  );

  useEffect(() => {
    // TODO(wittjosiah): Allow path/params for invitations to be customizable.
    const searchParams = new URLSearchParams(window.location.search);
    const spaceInvitationCode = searchParams.get('spaceInvitationCode');
    const deviceInvitationCode = searchParams.get('deviceInvitationCode');

    if (
      login &&
      !identity &&
      !spaceInvitationCode &&
      !deviceInvitationCode &&
      (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost)
    ) {
      void client.services.setLayout(ShellLayout.INITIALIZE_IDENTITY);
    }
  }, [client, identity, login]);

  return identity;
};
