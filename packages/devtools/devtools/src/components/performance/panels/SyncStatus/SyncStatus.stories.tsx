//
// Copyright 2023 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useState } from 'react';

import { type Client } from '@dxos/client';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { type SpaceSyncStateMap, getSyncSummary } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';

import { SyncStatus } from './SyncStatus';

const random = ({ min, max }: { min: number; max: number }) => min + Math.floor(Math.random() * (max - min));

const createSpaceSyncStateMap = async (client: Client): Promise<SpaceSyncStateMap> => {
  const spaces = await Promise.all(
    Array.from({ length: 10 }).map(() => client.spaces.create({ name: faker.company.name() })),
  );

  return spaces.reduce<SpaceSyncStateMap>((map, space, i) => {
    if (i > 4) {
      const total = random({ min: 10, max: 500 });
      map[space.id] = {
        localDocumentCount: total,
        remoteDocumentCount: total,
        missingOnLocal: 0,
        missingOnRemote: 0,
        differentDocuments: 0,
        totalDocumentCount: 0,
        unsyncedDocumentCount: 0,
      };
      return map;
    }

    const total = random({ min: 10, max: 500 });
    const haveLocal = random({ min: 0, max: total });
    const haveRemote = random({ min: 0, max: total });
    map[space.id] = {
      localDocumentCount: haveLocal,
      remoteDocumentCount: haveRemote,
      missingOnLocal: total - haveLocal,
      missingOnRemote: total - haveRemote,
      differentDocuments: Math.max(0, total - haveLocal - haveRemote),
      totalDocumentCount: total,
      unsyncedDocumentCount: Math.max(0, total - haveLocal - haveRemote),
    };

    return map;
  }, {});
};

const meta = {
  title: 'devtools/devtools/SyncStatus',
  component: SyncStatus,
  decorators: [withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'centered',
  },
  args: {
    classNames: 'w-[16rem] p-1 border border-separator',
  },
} satisfies Meta<typeof SyncStatus>;

export default meta;

type Story = StoryObj<typeof SyncStatus>;

export const Default: Story = {
  render: (args) => {
    return <SyncStatus {...args} state={{}} />;
  },
};

export const Sync: Story = {
  render: (args) => {
    const client = useClient();
    const [state, setState] = useState<SpaceSyncStateMap>({});
    useAsyncEffect(async () => {
      setState(await createSpaceSyncStateMap(client));
    });

    return <SyncStatus {...args} state={state} summary={getSyncSummary(state)} />;
  },
};
