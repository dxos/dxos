//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { schema } from '@dxos/protocols';
import { ShellDisplay, OsAppService, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { useClient, useIdentity, useSpaces } from '@dxos/react-client';
import { JoinDialog } from '@dxos/react-ui';
import { createProtoRpcPeer, ProtoRpcPeer } from '@dxos/rpc';
import { createIFramePort } from '@dxos/rpc-tunnel';
import { humanize } from '@dxos/util';

export const Shell = () => {
  const identity = useIdentity();
  const [appRpc, setAppRpc] = useState<ProtoRpcPeer<{ OsAppService: OsAppService }>>();
  const [layout, setLayout] = useState<ShellLayout>(identity ? ShellLayout.DEFAULT : ShellLayout.IDENTITY);
  const client = useClient();
  const spaces = useSpaces();

  // TODO(wittjosiah): Factor out.
  useEffect(() => {
    const timeout = setTimeout(async () => {
      const port = await createIFramePort({ channel: 'dxos:shell' });
      const appRpc = createProtoRpcPeer({
        requested: {
          OsAppService: schema.getService('dxos.iframe.OsAppService')
        },
        exposed: {
          OsShellService: schema.getService('dxos.iframe.OsShellService')
        },
        handlers: {
          OsShellService: {
            setLayout: async ({ layout }) => setLayout(layout)
          }
        },
        port
      });
      await appRpc.open();
      setAppRpc(appRpc);
    });

    return () => clearTimeout(timeout);
  }, []);

  if (!appRpc) {
    return null;
  }

  switch (layout) {
    case ShellLayout.IDENTITY:
      return (
        <JoinDialog
          mode='halo-only'
          onDone={() => appRpc.rpc.OsAppService.setDisplay({ display: ShellDisplay.NONE })}
        />
      );

    case ShellLayout.DEVICES:
      return null;

    case ShellLayout.SPACES:
      return (
        <div className='fixed top-0 left-0 w-72 h-screen bg-green-300/75'>
          <div className='flex'>
            <h2>Spaces</h2>
            <div className='flex-grow'></div>
            <button onClick={() => client.echo.createSpace()} data-testid='create-space'>
              Create
            </button>
            <button
              onClick={() => appRpc.rpc.OsAppService.setDisplay({ display: ShellDisplay.NONE })}
              data-testid='close-left-panel'
            >
              Close
            </button>
          </div>
          <ul>
            {spaces.map((space) => {
              const key = space.key.toHex();
              return (
                <li key={key} onClick={() => appRpc.rpc.OsAppService.setSpace({ spaceKey: space.key })}>
                  {humanize(key)}
                </li>
              );
            })}
          </ul>
        </div>
      );

    default:
      return null;
  }
};
