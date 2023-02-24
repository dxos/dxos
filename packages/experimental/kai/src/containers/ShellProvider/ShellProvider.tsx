//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';

import { IFrameClientServicesProxy, ShellDisplay, ShellLayout } from '@dxos/client';
import { MemoryShellRuntime } from '@dxos/client-services';
import { useClient, useIdentity } from '@dxos/react-client';
import { mx } from '@dxos/react-components';
import { Shell } from '@dxos/react-ui';

import { createPath, defaultFrameId, ShellContext, useAppRouter } from '../../hooks';

/**
 * Renders the DXOS shell and provides a way to set the layout of the shell from the rest of the app.
 */
// TODO(wittjosiah): Factor out?
export const ShellProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const { space, frame } = useAppRouter();

  //
  // IFrame Shell
  //

  useEffect(() => {
    if (client.services instanceof IFrameClientServicesProxy) {
      return client.services.joinedSpace.on(
        (spaceKey) => spaceKey && navigate(createPath({ spaceKey, frame: frame?.module.id ?? defaultFrameId }))
      );
    }
  }, []);

  useEffect(() => {
    if (client.services instanceof IFrameClientServicesProxy) {
      client.services.setSpaceProvider(() => space?.key);
    }
  }, [space]);

  //
  // Component Shell
  //

  const client = useClient();
  const identity = useIdentity();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const haloInvitationCode = searchParams.get('haloInvitationCode');
  const [display, setDisplay] = useState(
    !identity || spaceInvitationCode || haloInvitationCode ? ShellDisplay.FULLSCREEN : ShellDisplay.NONE
  );

  const shellRuntime = useMemo(() => {
    if (client.config.get('runtime.app.env.DX_VAULT') === 'true') {
      return;
    }

    if (spaceInvitationCode) {
      return new MemoryShellRuntime({
        layout: ShellLayout.JOIN_SPACE,
        invitationCode: spaceInvitationCode
      });
    }

    return new MemoryShellRuntime({
      layout: identity ? ShellLayout.DEFAULT : ShellLayout.INITIALIZE_IDENTITY,
      invitationCode: haloInvitationCode ?? undefined
    });
  }, [client, identity, spaceInvitationCode, haloInvitationCode]);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!space || !shellRuntime) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      if (event.key === '>' && event.shiftKey && modifier) {
        shellRuntime.setLayout(ShellLayout.DEVICE_INVITATIONS);
        setDisplay(ShellDisplay.FULLSCREEN);
      } else if (event.key === '.' && modifier) {
        shellRuntime.setLayout(ShellLayout.SPACE_INVITATIONS, { spaceKey: space.key });
        setDisplay(ShellDisplay.FULLSCREEN);
      }
    },
    [space, shellRuntime]
  );

  useEffect(() => {
    if (!shellRuntime) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [space]);

  useEffect(() => {
    if (!shellRuntime) {
      return;
    }

    return shellRuntime.contextUpdate.on(({ display, spaceKey }) => {
      setDisplay(display);
      spaceKey && navigate(createPath({ spaceKey, frame: frame?.module.id ?? defaultFrameId }));
    });
  }, [shellRuntime, frame]);

  return (
    <>
      {shellRuntime && (
        <div className={mx(display === ShellDisplay.NONE ? 'hidden' : '')}>
          <Shell runtime={shellRuntime} origin={window.location.origin} />
        </div>
      )}

      <ShellContext.Provider value={{ runtime: shellRuntime, setDisplay }}>
        {identity ? children : undefined}
      </ShellContext.Provider>
    </>
  );
};
