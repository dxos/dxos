//
// Copyright 2023 DXOS.org
//

import React, { useEffect, useState } from 'react';

import { ShellRuntime } from '@dxos/client';
import { ShellDisplay, ShellLayout } from '@dxos/protocols/proto/dxos/iframe';
import { useClient, useIdentity, useSpaces } from '@dxos/react-client';
import { JoinDialog } from '@dxos/react-ui';
import { humanize } from '@dxos/util';

export const Shell = ({ runtime }: { runtime: ShellRuntime }) => {
  const identity = useIdentity();
  const [layout, setLayout] = useState<ShellLayout>(identity ? ShellLayout.DEFAULT : ShellLayout.AUTH);
  const client = useClient();
  const spaces = useSpaces();

  useEffect(() => {
    return runtime.layoutUpdate.on((layout) => setLayout(layout));
  }, []);

  switch (layout) {
    case ShellLayout.AUTH:
      return <JoinDialog mode='halo-only' onDone={() => runtime.setDisplay(ShellDisplay.NONE)} />;

    case ShellLayout.SPACE_LIST:
      return (
        <div className='fixed top-0 left-0 w-72 h-screen bg-green-300/75'>
          <div className='flex'>
            <h2>Spaces</h2>
            <div className='flex-grow'></div>
            <button onClick={() => client.echo.createSpace()} data-testid='create-space'>
              Create
            </button>
            <button onClick={() => runtime.setDisplay(ShellDisplay.NONE)} data-testid='close-left-panel'>
              Close
            </button>
          </div>
          <ul>
            {spaces.map((space) => {
              const key = space.key.toHex();
              return (
                <li key={key} onClick={() => runtime.setSpace(space.key)}>
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
