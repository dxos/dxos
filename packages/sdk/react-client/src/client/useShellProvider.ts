//
// Copyright 2023 DXOS.org
//

import { useEffect } from 'react';

import { PublicKey } from '@dxos/client';
import { IFrameClientServicesHost, IFrameClientServicesProxy } from '@dxos/client/services';

import { useClient } from './ClientContext';

export type UseShellProviderOptions = {
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
};

/**
 * Use this hook to fully integrate an app with the shell.
 */
export const useShellProvider = ({ spaceKey, onJoinedSpace }: UseShellProviderOptions) => {
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
    if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
      client.services.setSpaceProvider(() => spaceKey);
    }
  }, [spaceKey]);
};
