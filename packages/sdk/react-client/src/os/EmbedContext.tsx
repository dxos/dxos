//
// Copyright 2023 DXOS.org
//

import React, { createContext, FC, PropsWithChildren, useContext, useEffect, useRef, useState } from 'react';

import { schema } from '@dxos/protocols';
import { EmbedLayout } from '@dxos/protocols/proto/dxos/iframe';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';

import { useConfig } from '../client';
import { useSpaces, useSpaceSetter } from '../echo';

export type EmbedContextProps = {
  layout: EmbedLayout;
  setLayout: (layout: EmbedLayout) => void;
};

export const EmbedContext = createContext<EmbedContextProps>({ layout: EmbedLayout.HIDDEN, setLayout: () => {} });

export const useEmbed = () => useContext(EmbedContext);

export const EMBED_CHANNEL = 'dxos:embed';
// TODO(wittjosiah): Factor out defaults.
const DEFAULT_SRC = 'https://halo.dxos.org/embed.html';

export const EmbedProvider: FC<PropsWithChildren<{}>> = ({ children }) => {
  const [layout, setLayout] = useState(EmbedLayout.HIDDEN);
  const config = useConfig();
  const setSpace = useSpaceSetter();
  const spaces = useSpaces();
  const [rpc, setRpc] = useState<ProtoRpcPeer<{}>>();
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const iframeSrc = config.get('runtime.client.embedSource') ?? DEFAULT_SRC;

  useEffect(() => {
    const timeout = setTimeout(async () => {
      const origin = new URL(iframeSrc).origin;
      const port = await createIFramePort({ iframe: iframeRef.current!, origin, channel: EMBED_CHANNEL });
      const rpc = createProtoRpcPeer({
        exposed: {
          OsEmbedService: schema.getService('dxos.iframe.OsEmbedService')
        },
        handlers: {
          OsEmbedService: {
            setLayout: async ({ layout }) => setLayout(layout),
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
    <EmbedContext.Provider value={{ layout, setLayout }}>
      {children}
      {/* TODO(wittjosiah): Transition opacity. */}
      <iframe
        id='__DXOS_EMBED'
        ref={iframeRef}
        src={iframeSrc}
        style={{ display: layout === EmbedLayout.HIDDEN ? 'none' : undefined }}
      />
    </EmbedContext.Provider>
  );
};
