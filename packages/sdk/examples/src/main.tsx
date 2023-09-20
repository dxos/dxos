//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { Airplane, Stack } from '@phosphor-icons/react';
import React from 'react';
import { createRoot } from 'react-dom/client';

import { Document } from '@braneframe/types';
import { Input, ThemeProvider, Tooltip } from '@dxos/aurora';
import { auroraTx } from '@dxos/aurora-theme';
import { ClientContext } from '@dxos/react-client';
import { ConnectionState } from '@dxos/react-client/mesh';
import { setupPeersInSpace } from '@dxos/react-client/testing';

import { EditorExample } from './examples';

// TODO(wittjosiah): Migrate to story once chromatic publish is fixed.
const main = async () => {
  const { clients, spaceKey } = await setupPeersInSpace({
    count: 2,
    onCreateSpace: (space) => {
      space.db.add(new Document());
    },
  });

  const handleToggleNetwork = async (checked: boolean) => {
    const mode = checked ? ConnectionState.OFFLINE : ConnectionState.ONLINE;
    await Promise.all(clients.map((client) => client.mesh.updateConfig(mode)));
  };

  const handleToggleBatching = async (checked: boolean) => {
    const batchSize = checked ? 64 : 0;
    clients.forEach((client) => {
      const space = client.spaces.get(spaceKey);
      if (space) {
        space.db._backend.maxBatchSize = batchSize;
      }
    });
  };

  createRoot(document.getElementById('root')!).render(
    <ThemeProvider tx={auroraTx}>
      <div className='demo'>
        <Tooltip.Provider>
          <div className='buttons'>
            <div className='flex'>
              <Input.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Input.Label>
                      <Airplane />
                    </Input.Label>
                  </Tooltip.Trigger>
                  <Tooltip.Content>Toggle Network</Tooltip.Content>
                </Tooltip.Root>
                <Input.Switch classNames='me-2' onCheckedChange={handleToggleNetwork} />
              </Input.Root>
            </div>
            <div className='flex'>
              <Input.Root>
                <Tooltip.Root>
                  <Tooltip.Trigger asChild>
                    <Input.Label>
                      <Stack />
                    </Input.Label>
                  </Tooltip.Trigger>
                  <Tooltip.Content>Toggle database batching</Tooltip.Content>
                </Tooltip.Root>
                <Input.Switch classNames='me-2' onCheckedChange={handleToggleBatching} />
              </Input.Root>
            </div>
          </div>
        </Tooltip.Provider>
        {clients.map((client, index) => (
          <ClientContext.Provider key={index} value={{ client }}>
            <EditorExample id={index} spaceKey={spaceKey} />
          </ClientContext.Provider>
        ))}
      </div>
    </ThemeProvider>,
  );
};

void main();
