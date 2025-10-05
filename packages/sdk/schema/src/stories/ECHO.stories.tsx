//
// Copyright 2025 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { Config } from '@dxos/client';
import { Filter } from '@dxos/client/echo';
import { Obj } from '@dxos/echo';
import { invariant } from '@dxos/invariant';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { withClientProvider } from '@dxos/react-client/testing';
import { Button, Toolbar } from '@dxos/react-ui';
import { JsonFilter } from '@dxos/react-ui-syntax-highlighter';
import { type ValueGenerator, createObjectFactory } from '@dxos/schema/testing';
import { withTheme } from '@dxos/storybook-utils';

import { DataType, DataTypes } from '../common';

faker.seed(1);

// TODO(burdon): Evolve dxos/random to support this directly.
const generator = faker as any as ValueGenerator;

const DefaultStory = () => {
  const [events, setEvents] = useState<{ type: string; duration: number }[]>([]);
  const client = useClient();
  const space = client.spaces.get().at(0);

  const test = async (type: string, fn: () => Promise<void> | void) => {
    const t = performance.now();
    await fn();
    setEvents([...events, { type, duration: performance.now() - t }]);
  };

  const handleReset = async () => {
    await client.reset();
    window.location.reload();
  };

  const handleReload = async () => {
    window.location.reload();
  };

  const handleCreate = async () => {
    await test('create', async () => {
      invariant(space);
      space.db.add(Obj.make(DataType.Organization, { id: 'dxos', name: 'DXOS', website: 'https://dxos.org' }));
    });
  };

  const handleCreateFactory = async () => {
    await test('create-objects', async () => {
      invariant(space);
      const createObjects = createObjectFactory(space.db, generator);
      await createObjects([{ type: DataType.Organization, count: 1_000 }]);
    });
  };

  const handleFlush = async () => {
    await test('flush', async () => {
      invariant(space);
      await space.db.flush({ indexes: true });
    });
  };

  const handleQuery = async () => {
    await test('query', async () => {
      invariant(space);
      await space.db.query(Filter.everything()).run();
    });
  };

  const data = {
    space: space?.id,
    spaces: client.spaces.get().map((space) => space.db.toJSON()),
    events,
  };

  return (
    <div className='flex flex-col w-full'>
      <Toolbar.Root>
        <Button onClick={handleReset}>Reset</Button>
        <Button onClick={handleReload}>Reload</Button>
        <Button onClick={handleCreate}>Create</Button>
        <Button onClick={handleCreateFactory}>Create 1000</Button>
        <Button onClick={handleFlush}>Flush</Button>
        <Button onClick={handleQuery}>Query</Button>
      </Toolbar.Root>
      <JsonFilter data={data} />
    </div>
  );
};

const meta = {
  title: 'sdk/schema/ECHO',
  render: DefaultStory,
  decorators: [
    withTheme,
    withClientProvider({
      createIdentity: true,
      config: new Config({
        runtime: {
          client: {
            storage: {
              persistent: true,
            },
            // enableVectorIndexing: true,
          },
        },
      }),
      types: DataTypes,
    }),
  ],
  parameters: {
    layout: 'fullscreen',
  },
} satisfies Meta<typeof DefaultStory>;

export default meta;

type Story = StoryObj<typeof meta>;

export const Default: Story = {};
