//
// Copyright 2023 DXOS.org
//

import React from 'react';

import { ShellDisplay, OsAppService } from '@dxos/protocols/proto/dxos/iframe';
import { useClient, useSpaces } from '@dxos/react-client';
import { ProtoRpcPeer } from '@dxos/rpc';
import { humanize } from '@dxos/util';

export const Shell = ({ rpc }: { rpc: ProtoRpcPeer<{ OsAppService: OsAppService }> }) => {
  const client = useClient();
  const spaces = useSpaces();

  return (
    <div className='fixed top-0 left-0 w-72 h-screen bg-green-300/75'>
      <div className='flex'>
        <h2>Spaces</h2>
        <div className='flex-grow'></div>
        <button onClick={() => client.echo.createSpace()} data-testid='create-space'>
          Create
        </button>
        <button
          onClick={() => rpc.rpc.OsAppService.setDisplay({ display: ShellDisplay.NONE })}
          data-testid='close-left-panel'
        >
          Close
        </button>
      </div>
      <ul>
        {spaces.map((space) => {
          const key = space.key.toHex();
          return (
            <li key={key} onClick={() => rpc.rpc.OsAppService.setSpace({ spaceKey: space.key })}>
              {humanize(key)}
            </li>
          );
        })}
      </ul>
    </div>
  );
};
