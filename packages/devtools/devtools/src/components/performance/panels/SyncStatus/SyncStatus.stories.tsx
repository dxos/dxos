//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React, { useState } from 'react';

import { type Client } from '@dxos/client';
import { faker } from '@dxos/random';
import { useClient } from '@dxos/react-client';
import { getSyncSummary, type SpaceSyncStateMap } from '@dxos/react-client/echo';
import { withClientProvider } from '@dxos/react-client/testing';
import { useAsyncEffect } from '@dxos/react-ui';
import { withTheme, withLayout } from '@dxos/storybook-utils';

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
      differentDocuments: 0,
    };

    return map;
  }, {});
};

const meta: Meta<typeof SyncStatus> = {
  title: 'devtools/devtools/SyncStatus',
  component: SyncStatus,
  decorators: [withTheme, withLayout(), withClientProvider({ createIdentity: true })],
  parameters: {
    layout: 'centered',
  },
  args: {
    classNames: 'm-2 border border-separator rounded-md',
  },
};

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
