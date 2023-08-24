//
// Copyright 2023 DXOS.org
//

import { useCallback, useEffect } from 'react';

import { PublicKey } from '@dxos/client';
import { IFrameClientServicesHost, IFrameClientServicesProxy } from '@dxos/client/services';

import { useClient } from './ClientContext';

export type UseShellOptions = {
  /**
   * The key of the current space.
   *
   * This is passed to the shell when the user presses the keyboard shortcut to open space invitations.
   */
  spaceKey?: PublicKey;

  /**
   * This is called when a user joins a space.
   */
  onJoinedSpace?: (spaceKey?: PublicKey) => void;

  /**
   * This is called when a code is no longer redeemable.
   */
  onInvalidatedInvitationCode?: (code?: string) => void;
};

type UseShellResult = {
  setLayout: IFrameClientServicesProxy['setLayout'];
};

/**
 * Use this hook to fully integrate an app with the shell.
 */
export const useShell = ({ spaceKey, onJoinedSpace, onInvalidatedInvitationCode }: UseShellOptions): UseShellResult => {
  const client = useClient();

  useEffect(() => {
    if (
      (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) &&
      onJoinedSpace
    ) {
      return client.services.joinedSpace.on(onJoinedSpace);
    }
  }, []);

  useEffect(() => {
    if (
      (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) &&
      onInvalidatedInvitationCode
    ) {
      return client.services.invalidatedInvitationCode.on(onInvalidatedInvitationCode);
    }
  }, []);

  useEffect(() => {
    if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
      client.services.setSpaceProvider(() => spaceKey);
    }
  }, [spaceKey]);

  const setLayout: IFrameClientServicesProxy['setLayout'] = useCallback(
    async (layout, options = {}) => {
      if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
        await client.services.setLayout(layout, options);
      }
    },
    [client],
  );

  return {
    setLayout,
  };
};
