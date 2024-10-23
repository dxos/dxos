//
// Copyright 2023 DXOS.org
//

import '@dxos-theme';

import { type Meta } from '@storybook/react';
import React from 'react';

import { SpaceId } from '@dxos/keys';
import { withTheme, withLayout } from '@dxos/storybook-utils';

import { SyncStatusDetail, SyncStatusIndicator } from './SyncStatus';
import { getSyncSummary, type SpaceSyncStateMap } from './types';
import translations from '../../translations';

const DefaultStory = (props: any) => {
  return (
    <div className='flex flex-col-reverse p-4 '>
      <SyncStatusIndicator {...props} />
    </div>
  );
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

export const Detail = {
  render: SyncStatusDetail,
  args: {
    state,
    summary: getSyncSummary(state),
    classNames: 'm-2 w-[200px] border border-separator rounded-md',
  },
};

const meta: Meta = {
  title: 'plugins/plugin-space/SyncStatusIndicator',
  component: SyncStatusIndicator,
  render: DefaultStory,
  decorators: [withTheme, withLayout({ fullscreen: true })],
  parameters: { translations },
};

export default meta;
