//
// Copyright 2023 DXOS.org
//

import React, { FC, PropsWithChildren, useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';

import { ShellDisplay, ShellLayout } from '@dxos/client';
import { MemoryShellRuntime } from '@dxos/client-services';
import { useConfig, useCurrentSpace, useIdentity } from '@dxos/react-client';
import { mx } from '@dxos/react-components';
import { Shell } from '@dxos/react-ui';

import { ShellContext } from '../hooks';

/**
 * Renders the DXOS shell and provides a way to set the layout of the shell from the rest of the app.
 */
// TODO(wittjosiah): Factor out?
export const ShellProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const config = useConfig();
  const vaultEnabled = config.get('runtime.app.env.DX_VAULT') === 'true';
  const identity = useIdentity();
  const [space, setSpace] = useCurrentSpace();
  const [searchParams] = useSearchParams();
  const spaceInvitationCode = searchParams.get('spaceInvitationCode');
  const haloInvitationCode = searchParams.get('haloInvitationCode');
  const [display, setDisplay] = useState(
    !identity || spaceInvitationCode || haloInvitationCode ? ShellDisplay.FULLSCREEN : ShellDisplay.NONE
  );
  const shellRuntime = useMemo(() => {
    if (spaceInvitationCode) {
      return new MemoryShellRuntime({
        layout: ShellLayout.JOIN_SPACE,
        invitationCode: spaceInvitationCode
      });
    }

    return new MemoryShellRuntime({
      layout: identity ? ShellLayout.DEFAULT : ShellLayout.AUTH,
      invitationCode: haloInvitationCode ?? undefined
    });
  }, []);

  const handleKeyDown = useCallback(
    (event: KeyboardEvent) => {
      if (!space) {
        return;
      }

      const modifier = event.ctrlKey || event.metaKey;
      if (event.key === '>' && event.shiftKey && modifier) {
        shellRuntime.setLayout(ShellLayout.SPACE_LIST, { spaceKey: space.key });
        setDisplay(ShellDisplay.FULLSCREEN);
      } else if (event.key === '.' && modifier) {
        shellRuntime.setLayout(ShellLayout.CURRENT_SPACE, { spaceKey: space.key });
        setDisplay(ShellDisplay.FULLSCREEN);
      }
    },
    [space]
  );

  useEffect(() => {
    if (vaultEnabled) {
      return;
    }

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (vaultEnabled) {
      return;
    }

    return shellRuntime.contextUpdate.on(({ display, spaceKey }) => {
      setSpace(spaceKey);
      setDisplay(display);
    });
  }, []);

  return (
    <>
      {!vaultEnabled && (
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
