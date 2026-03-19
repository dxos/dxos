//
// Copyright 2024 DXOS.org
//

import React from 'react';

import * as Channel from '../../types/Channel';

export type ChannelSettingsProps = {
  subject: Channel.YouTubeChannel;
};

export const ChannelSettings = ({ subject: channel }: ChannelSettingsProps) => {
  return (
    <div className='flex flex-col gap-4 p-4'>
      <h3 className='text-md font-medium'>Channel Settings</h3>
      <div className='flex flex-col gap-2 text-sm'>
        <div>
          <span className='text-description'>Name:</span>{' '}
          <span>{channel.name ?? 'Not set'}</span>
        </div>
        <div>
          <span className='text-description'>Channel URL:</span>{' '}
          <span>{channel.channelUrl ?? 'Not set'}</span>
        </div>
        <div>
          <span className='text-description'>Channel ID:</span>{' '}
          <span>{channel.channelId ?? 'Not set'}</span>
        </div>
        <div>
          <span className='text-description'>Last Synced:</span>{' '}
          <span>{channel.lastSyncedAt ? new Date(channel.lastSyncedAt).toLocaleString() : 'Never'}</span>
        </div>
      </div>
    </div>
  );
};
