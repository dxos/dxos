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
  useState,
} from 'react';

import { mx } from '@dxos/aurora-theme';
import {
  IFrameClientServicesProxy,
  type PublicKey,
  ShellDisplay,
  ShellLayout,
  IFrameClientServicesHost,
  useClient,
  useShellProvider,
  LayoutRequest,
} from '@dxos/react-client';
import type { Space } from '@dxos/react-client/echo';
import { useIdentity } from '@dxos/react-client/halo';

import { Shell } from './Shell';
import { MemoryShellRuntime } from './memory-shell-runtime';

export type ShellContextProps = {
  runtime?: MemoryShellRuntime;
  setDisplay?: (display: ShellDisplay) => void;
};

export const ShellContext: Context<ShellContextProps> = createContext<ShellContextProps>({});

type SetLayout = (layout: ShellLayout, options?: Omit<LayoutRequest, 'layout'>) => void;

export const useShell = (): { setLayout: SetLayout } => {
  const client = useClient();
  const { runtime, setDisplay } = useContext(ShellContext);

  const setLayout: SetLayout = async (layout, options) => {
    if (runtime) {
      if (layout === ShellLayout.DEFAULT) {
        setDisplay?.(ShellDisplay.NONE);
      } else {
        setDisplay?.(ShellDisplay.FULLSCREEN);
      }

      runtime.setLayout(layout, options);
    }

    if (client.services instanceof IFrameClientServicesProxy || client.services instanceof IFrameClientServicesHost) {
      await client.services.setLayout(layout, options);
    }
  };

  return {
    setLayout,
  };
};

export type ShellProviderProps = PropsWithChildren<{
  space?: Space;
  deviceInvitationCode?: string | null;
  spaceInvitationCode?: string | null;
  onJoinedSpace?: (spaceKey?: PublicKey) => void;
}>;

/**
 * Renders the DXOS shell and provides a way to set the layout of the shell from the rest of the app.
 */
export const ShellProvider = ({
  space,
  deviceInvitationCode,
  spaceInvitationCode,
  onJoinedSpace,
  children,
}: ShellProviderProps) => {
  const client = useClient();

  //
  // IFrame Shell
  //

  useShellProvider({ spaceKey: space?.key, onJoinedSpace });

  //
  // Component Shell
  //

  const identity = useIdentity();
  const [display, setDisplay] = useState(
    !identity || spaceInvitationCode || deviceInvitationCode ? ShellDisplay.FULLSCREEN : ShellDisplay.NONE,
  );

  const shellRuntime = useMemo(() => {
    if (client.config.get('runtime.app.env.DX_VAULT') !== 'false') {
      return;
    }

    if (spaceInvitationCode) {
      return new MemoryShellRuntime({
        layout: ShellLayout.JOIN_SPACE,
        invitationCode: spaceInvitationCode,
      });
    }

    if (deviceInvitationCode) {
      return new MemoryShellRuntime({
        layout: ShellLayout.INITIALIZE_IDENTITY,
        invitationCode: deviceInvitationCode,
      });
    }

    return new MemoryShellRuntime({ layout: identity ? ShellLayout.DEFAULT : ShellLayout.INITIALIZE_IDENTITY });
  }, [client, identity, spaceInvitationCode, deviceInvitationCode]);

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
    [space, shellRuntime],
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
