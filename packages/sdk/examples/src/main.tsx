//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { Airplane, Stack } from '@phosphor-icons/react';
import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';

import { create } from '@dxos/echo-schema';
import { registerSignalsRuntime } from '@dxos/echo-signals';
import { TextType, DocumentType } from '@dxos/plugin-markdown/types';
import { faker } from '@dxos/random';
import { Client, ClientProvider } from '@dxos/react-client';
import { type Space, type AbstractTypedObject } from '@dxos/react-client/echo';
import { ConnectionState } from '@dxos/react-client/mesh';
import { TestBuilder, performInvitation } from '@dxos/react-client/testing';
import { Input, ThemeProvider, Tooltip, Status } from '@dxos/react-ui';
import { defaultTx } from '@dxos/react-ui-theme';
import type { MaybePromise } from '@dxos/util';

import TaskList from './examples/TaskList';

const root = createRoot(document.getElementById('root')!);

const testBuilder = new TestBuilder();

type PeersInSpaceProps = {
  count?: number;
  types?: AbstractTypedObject<any>[];
  onSpaceCreated?: (props: { space: Space }) => MaybePromise<void>;
};

const setupPeersInSpace = async (options: PeersInSpaceProps = {}) => {
  const { count = 1, types, onSpaceCreated } = options;
  registerSignalsRuntime();
  const clients = [...Array(count)].map(
    (_) => new Client({ services: testBuilder.createLocalClientServices(), types }),
  );
  await Promise.all(clients.map((client) => client.initialize()));
  await Promise.all(clients.map((client) => client.halo.createIdentity()));
  const space = await clients[0].spaces.create({ name: faker.commerce.productName() });
  await onSpaceCreated?.({ space });
  await Promise.all(clients.slice(1).map((client) => performInvitation({ host: space, guest: client.spaces })));
  return { spaceKey: space.key, clients };
};

// TODO(wittjosiah): Migrate to story once chromatic publish is fixed.
const main = async () => {
  const { clients, spaceKey } = await setupPeersInSpace({
    count: 2,
    types: [DocumentType, TextType],
    onSpaceCreated: ({ space }) => {
      space.db.add(
        create(DocumentType, {
          content: create(TextType, { content: '## Type here...\n\ntry the airplane mode switch.' }),
          threads: [],
        }),
      );
    },
  });

  const handleToggleNetwork = async (checked: boolean) => {
    const mode = checked ? ConnectionState.OFFLINE : ConnectionState.ONLINE;
    await Promise.all(clients.map((client) => client.mesh.updateConfig(mode)));
  };

  const handleToggleBatching = async (checked: boolean) => {
    const _batchSize = checked ? 64 : 0;
    clients.forEach((client) => {
      const space = client.spaces.get(spaceKey);
      if (space) {
        // TODO(dmaretskyi): Is this code still relevant?
        // space.db._backend.maxBatchSize = batchSize;
      }
    });
  };

  const TwoPeersExample = () => {
    const [offline, setOffline] = useState(false);
    const [batching, setBatching] = useState(false);

    return (
      <ThemeProvider tx={defaultTx} themeMode='light'>
        <div className='demo'>
          <Tooltip.Provider>
            <div className='buttons'>
              <Tooltip.Root>
                <Tooltip.Trigger asChild>
                  <div className='flex'>
                    <Input.Root>
                      <Input.Switch
                        data-testid='airplane-mode'
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
                        data-testid='batching'
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
            <ClientProvider key={index} client={client}>
              <TaskList id={index} spaceKey={spaceKey} />
            </ClientProvider>
          ))}
        </div>
      </ThemeProvider>
    );
  };

  root.render(<TwoPeersExample />);
};

const fallback = () => {
  root.render(
    <ThemeProvider tx={defaultTx}>
      <div className='flex bs-[100dvh] justify-center items-center'>
        <Status indeterminate aria-label='Initializing' />
      </div>
    </ThemeProvider>,
  );
};

void fallback();
setTimeout(main, 0);
