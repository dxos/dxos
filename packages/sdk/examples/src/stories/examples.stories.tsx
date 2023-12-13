//
// Copyright 2022 DXOS.org
//

import '@dxosTheme';

import { type DecoratorFunction } from '@storybook/csf';
import { type ReactRenderer } from '@storybook/react';
import React from 'react';

import { Document } from '@braneframe/types';
import { type Client, type PublicKey } from '@dxos/react-client';
import { ConnectionState } from '@dxos/react-client/mesh';
import { ClientRepeater, setupPeersInSpace, ToggleNetworkDecorator } from '@dxos/react-client/testing';
import { Input } from '@dxos/react-ui';
import { withTheme } from '@dxos/storybook-utils';

import { EditorExample, TaskListExample } from '../examples';
import { types } from '../proto/gen/schema';

export default {
  title: 'DXOS Examples',
  decorators: [withTheme],
};

const tasksList = await setupPeersInSpace({ count: 2 });

export const TaskList = {
  render: () => (
    <ClientRepeater clients={tasksList.clients} Component={TaskListExample} args={{ spaceKey: tasksList.spaceKey }} />
  ),
  decorators: [ToggleNetworkDecorator({ clients: tasksList.clients })],
};

const editor = await setupPeersInSpace({
  count: 2,
  schema: types,
  onCreateSpace: (space) => {
    space.db.add(new Document());
  },
});

// TODO(wittjosiah): Reconcile with ToggleNetworkDecorator.
const DemoToggles = ({
  clients,
  spaceKey,
}: {
  clients: Client[];
  spaceKey: PublicKey;
}): DecoratorFunction<ReactRenderer, any> => {
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

  return (Story, context) => (
    <>
      <div className='demo-buttons space-b-2'>
        <div className='flex'>
          <Input.Root>
            <Input.Switch classNames='me-2' onCheckedChange={handleToggleNetwork} />
            <Input.Label>
              Disable{' '}
              <a
                href='https://docs.dxos.org/guide/platform/'
                target='_blank'
                rel='noreferrer'
                className='text-primary-600 dark:text-primary-400'
              >
                replication
              </a>{' '}
              (go offline)
            </Input.Label>
          </Input.Root>
        </div>
        <div className='flex'>
          <Input.Root>
            <Input.Switch classNames='me-2' onCheckedChange={handleToggleBatching} />
            <Input.Label>Enable mutation batching</Input.Label>
          </Input.Root>
        </div>
      </div>
      {Story({ args: context.args })}
    </>
  );
};

export const Editor = {
  render: () => (
    <ClientRepeater
      clients={editor.clients}
      className='demo'
      Component={EditorExample}
      args={{ spaceKey: editor.spaceKey }}
    />
  ),
  decorators: [DemoToggles(editor)],
};
