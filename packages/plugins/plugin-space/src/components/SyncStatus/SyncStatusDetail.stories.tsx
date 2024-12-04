//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta, type StoryObj } from '@storybook/react';
import React from 'react';

import { faker } from '@dxos/random';
import { useStoryClientData, withClientProvider } from '@dxos/react-client/testing';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { SyncStatusDetail } from './SyncStatus';
import { getSyncSummary, type SpaceSyncStateMap } from './sync-state';
import translations from '../../translations';

const random = ({ min, max }: { min: number; max: number }) => min + Math.floor(Math.random() * (max - min));

export const Default: StoryObj<typeof SyncStatusDetail> = {};

export const Empty: StoryObj<typeof SyncStatusDetail> = {
  render: (args) => {
    return <SyncStatusDetail {...args} state={{}} />;
  },
};

const meta: Meta = {
  title: 'plugins/plugin-space/SyncStatusDetail',
  component: SyncStatusDetail,
  render: (args) => {
    const { state } = useStoryClientData<{ state: SpaceSyncStateMap }>();

    return <SyncStatusDetail {...args} state={state} summary={getSyncSummary(state)} />;
  },
  decorators: [
    withTheme,
    withLayout({ fullscreen: true }),
    withClientProvider({
      createIdentity: true,
      onIdentityCreated: async ({ client }) => {
        const spaces = await Promise.all(
          Array.from({ length: 10 }).map(() => client.spaces.create({ name: faker.company.name() })),
        );

        const state: SpaceSyncStateMap = spaces.reduce<SpaceSyncStateMap>((map, space, i) => {
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

        return { state };
      },
    }),
  ],
  parameters: { translations },
  args: {
    classNames: 'm-2 border border-separator rounded-md',
  },
};

export default meta;
