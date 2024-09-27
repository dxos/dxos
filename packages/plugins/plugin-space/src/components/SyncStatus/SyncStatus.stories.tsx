//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import React from 'react';

import { SpaceId } from '@dxos/keys';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { Bar as BarComponent, SyncStatusIndicator } from './SyncStatus';
import { type SpaceSyncStateMap } from './types';
import translations from '../../translations';

const Story = (props: any) => {
  return (
    <div className='flex flex-col-reverse p-4 '>
      <SyncStatusIndicator {...props} />
    </div>
  );
};

export default {
  title: 'plugin-space/SyncStatusIndicator',
  decorators: [withTheme, withLayout({ fullscreen: true })],
  component: SyncStatusIndicator,
  parameters: { translations },
  render: Story,
};

const random = ({ min, max }: { min: number; max: number }) => min + Math.floor(Math.random() * (max - min));

const state: SpaceSyncStateMap = Array.from({ length: 5 }).reduce<SpaceSyncStateMap>((map) => {
  const total = random({ min: 10, max: 500 });
  const haveLocal = random({ min: 0, max: total });
  const haveRemote = random({ min: 0, max: total });
  map[SpaceId.random()] = {
    localDocumentCount: haveLocal,
    remoteDocumentCount: haveRemote,
    missingOnLocal: total - haveLocal,
    missingOnRemote: total - haveRemote,
    differentDocuments: 0,
  };

  return map;
}, {});

export const Default = {
  args: {
    state,
  },
};

export const Bar = {
  render: BarComponent,
  args: {
    count: 10,
    total: 100,
  },
};
