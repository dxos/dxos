//
// Copyright 2023 DXOS.org
//

import React, {
  createContext,
  FC,
  PropsWithChildren,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState
} from 'react';

import { schema } from '@dxos/protocols';
import { OsShellService, ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { useConfig } from '../client';
import { useSpaces, useSpaceSetter } from '../echo';
import { useIdentity } from '../halo';

export type ShellContextProps = {
  display: ShellDisplay;
  setLayout: (layout: ShellLayout) => void;
};

export const ShellContext = createContext<ShellContextProps>({
  display: ShellDisplay.NONE,
  setLayout: () => {}
});

export const useShell = () => useContext(ShellContext);

export const EMBED_CHANNEL = 'dxos:shell';
// TODO(wittjosiah): Factor out defaults.
const DEFAULT_SRC = 'https://halo.dxos.org/shell.html';

// TODO(wittjosiah): Make this a part of client.
export const ShellProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const config = useConfig();
  const identity = useIdentity();
  const [display, setDisplay] = useState(identity ? ShellDisplay.NONE : ShellDisplay.FULLSCREEN);
  const setSpace = useSpaceSetter();
  const spaces = useSpaces();
  const [shellRpc, setRpc] = useState<ProtoRpcPeer<{ OsShellService: OsShellService }>>();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeSrc = config.get('runtime.client.shellSource') ?? DEFAULT_SRC;

  const setLayout = useCallback(
    (layout: ShellLayout) => {
      void shellRpc?.rpc.OsShellService.setLayout({ layout });
      setDisplay(ShellDisplay.FULLSCREEN);
    },
    [shellRpc]
  );

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const origin = new URL(iframeSrc).origin;
      const port = await createIFramePort({ iframe: iframeRef.current!, origin, channel: EMBED_CHANNEL });
      const shellRpc = createProtoRpcPeer({
        requested: {
          OsShellService: schema.getService('dxos.iframe.OsShellService')
        },
        exposed: {
          OsAppService: schema.getService('dxos.iframe.OsAppService')
        },
        handlers: {
          OsAppService: {
            setDisplay: async ({ display }) => setDisplay(display),
            setSpace: async ({ spaceKey }) => {
              const space = spaces.find((space) => space.key.equals(spaceKey));
              setSpace(space);
            }
          }
        },
        port
      });
      await shellRpc.open();
      setRpc(shellRpc);
    });

    return () => {
      clearTimeout(timeout);
      void shellRpc?.close();
    };
  }, []);

  return (
    <ShellContext.Provider value={{ display, setLayout }}>
      {children}
      {/* TODO(wittjosiah): Transition opacity. */}
      <iframe
        id='__DXOS_SHELL'
        ref={iframeRef}
        src={iframeSrc}
        style={{ display: display === ShellDisplay.NONE ? 'none' : undefined }}
      />
    </ShellContext.Provider>
  );
};
