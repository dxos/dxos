//
// Copyright 2023 DXOS.org
//

import '@dxosTheme';
import { Airplane, Stack } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { Document } from '@braneframe/types';
import { Input, ThemeProvider, Tooltip } from '@dxos/aurora';
import { auroraTx } from '@dxos/aurora-theme';
import { ClientContext } from '@dxos/react-client';
import { Text } from '@dxos/react-client/echo';
import { ConnectionState } from '@dxos/react-client/mesh';
import { setupPeersInSpace } from '@dxos/react-client/testing';

import { EditorExample } from './examples';

// TODO(wittjosiah): Migrate to story once chromatic publish is fixed.
const main = async () => {
  const { clients, spaceKey } = await setupPeersInSpace({
    count: 2,
    onCreateSpace: (space) => {
      space.db.add(
        new Document({
          content: new Text('## Type here...\n\ntry the airplane mode switch.'),
        }),
      );
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

  const TwoPeersExample = () => {
    const [offline, setOffline] = useState(false);
    const [batching, setBatching] = useState(false);

    return (
      <ThemeProvider tx={auroraTx}>
        <div className='demo'>
          <Tooltip.Provider>
            <div className='buttons'>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className='flex'>
                    <Input.Root>
                      <Input.Switch
                        classNames='me-2'
                        onCheckedChange={(e) => {
                          setOffline(!offline);
                          return handleToggleNetwork(e);
                        }}
                      />
                      <Input.Label>
                        <Airplane size={28} className={offline ? 'active' : ''} />
                      </Input.Label>
                    </Input.Root>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>Offline mode</Tooltip.Content>
              </Tooltip.Root>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className='flex'>
                    <Input.Root>
                      <Input.Switch
                        classNames='me-2'
                        onCheckedChange={(e) => {
                          setBatching(!batching);
                          return handleToggleBatching(e);
                        }}
                      />
                      <Input.Label>
                        <Stack size={28} className={batching ? 'active' : ''} />
                      </Input.Label>
                    </Input.Root>
                  </div>
                </Tooltip.Trigger>
                <Tooltip.Content>Write batching</Tooltip.Content>
              </Tooltip.Root>
            </div>
          </Tooltip.Provider>
          {clients.map((client, index) => (
            <ClientContext.Provider key={index} value={{ client }}>
              <EditorExample id={index} spaceKey={spaceKey} />
            </ClientContext.Provider>
          ))}
        </div>
      </ThemeProvider>
    );
  };

  createRoot(document.getElementById('root')!).render(<TwoPeersExample />);
};

void main();
