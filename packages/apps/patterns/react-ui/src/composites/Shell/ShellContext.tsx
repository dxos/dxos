//
// Copyright 2023 DXOS.org
//

import React, {
  Context,
  createContext,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState
} from 'react';

import { mx } from '@dxos/aurora';
import {
  IFrameClientServicesProxy,
  type PublicKey,
  type ShellController,
  ShellDisplay,
  ShellLayout,
  type Space
} from '@dxos/client';
import { MemoryShellRuntime } from '@dxos/client-services';
import { useClient, useIdentity } from '@dxos/react-client';

import { Shell } from './Shell';

export type ShellContextProps = {
  runtime?: MemoryShellRuntime;
  setDisplay?: (display: ShellDisplay) => void;
};

export const ShellContext: Context<ShellContextProps> = createContext<ShellContextProps>({});

export const useShell = (): {
  setLayout: ShellController['setLayout'];
} => {
  const client = useClient();
  const { runtime, setDisplay } = useContext(ShellContext);

  const setLayout: ShellController['setLayout'] = async (layout, options) => {
    if (runtime) {
      if (layout === ShellLayout.DEFAULT) {
        setDisplay?.(ShellDisplay.NONE);
      } else {
        setDisplay?.(ShellDisplay.FULLSCREEN);
      }

      runtime.setLayout(layout, options);
    }

    if (client.services instanceof IFrameClientServicesProxy) {
      await client.services.setLayout(layout, options);
    }
  };

  return {
    setLayout
  };
};
export type ShellProviderProps = PropsWithChildren<{
  space?: Space;
  // TODO(wittjosiah): `deviceInvitationCode`.
  haloInvitationCode?: string | null;
  spaceInvitationCode?: string | null;
  onJoinedSpace?: (spaceKey?: PublicKey) => void;
}>;

/**
 * Renders the DXOS shell and provides a way to set the layout of the shell from the rest of the app.
 */
export const ShellProvider = ({
  space,
  haloInvitationCode,
  spaceInvitationCode,
  onJoinedSpace,
  children
}: ShellProviderProps) => {
  //
  // IFrame Shell
  //

  useEffect(() => {
    if (client.services instanceof IFrameClientServicesProxy && onJoinedSpace) {
      return client.services.joinedSpace.on(onJoinedSpace);
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
  const [display, setDisplay] = useState(
    !identity || spaceInvitationCode || haloInvitationCode ? ShellDisplay.FULLSCREEN : ShellDisplay.NONE
  );

  const shellRuntime = useMemo(() => {
    if (client.config.get('runtime.app.env.DX_VAULT') !== 'false') {
      return;
    }

    if (spaceInvitationCode) {
      return new MemoryShellRuntime({
        layout: ShellLayout.JOIN_SPACE,
        invitationCode: spaceInvitationCode
      });
    }

    if (haloInvitationCode) {
      return new MemoryShellRuntime({
        layout: ShellLayout.INITIALIZE_IDENTITY,
        invitationCode: haloInvitationCode
      });
    }

    return new MemoryShellRuntime({ layout: identity ? ShellLayout.DEFAULT : ShellLayout.INITIALIZE_IDENTITY });
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
  }, [shellRuntime, handleKeyDown]);

  useEffect(() => {
    if (!shellRuntime) {
      return;
    }

    return shellRuntime.contextUpdate.on(({ display, spaceKey }) => {
      setDisplay(display);
      onJoinedSpace?.(spaceKey);
    });
  }, [shellRuntime]);

  return (
    <>
      {shellRuntime && (
        <div className={mx(display === ShellDisplay.NONE ? 'hidden' : '')}>
          <Shell runtime={shellRuntime} origin={window.location.origin} />
        </div>
      )}

      <ShellContext.Provider value={{ runtime: shellRuntime, setDisplay }}>{children}</ShellContext.Provider>
    </>
  );
};
