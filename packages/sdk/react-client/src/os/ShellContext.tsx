//
// Copyright 2023 DXOS.org
//

import React, { createContext, FC, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';

import { schema } from '@dxos/protocols';
import { ShellDisplay } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { useConfig } from '../client';
import { useSpaces, useSpaceSetter } from '../echo';

export type ShellContextProps = {
  display: ShellDisplay;
  setDisplay: (display: ShellDisplay) => void;
};

export const ShellContext = createContext<ShellContextProps>({ display: ShellDisplay.NONE, setDisplay: () => {} });

export const useShell = () => useContext(ShellContext);

export const EMBED_CHANNEL = 'dxos:shell';
// TODO(wittjosiah): Factor out defaults.
const DEFAULT_SRC = 'https://halo.dxos.org/shell.html';

export const ShellProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [display, setDisplay] = useState(ShellDisplay.NONE);
  const config = useConfig();
  const setSpace = useSpaceSetter();
  const spaces = useSpaces();
  const [rpc, setRpc] = useState<ProtoRpcPeer<{}>>();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeSrc = config.get('runtime.client.shellSource') ?? DEFAULT_SRC;

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const origin = new URL(iframeSrc).origin;
      const port = await createIFramePort({ iframe: iframeRef.current!, origin, channel: EMBED_CHANNEL });
      const rpc = createProtoRpcPeer({
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
      await rpc.open();
      setRpc(rpc);
    });

    return () => {
      clearTimeout(timeout);
      void rpc?.close();
    };
  }, []);

  return (
    <ShellContext.Provider value={{ display, setDisplay }}>
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
