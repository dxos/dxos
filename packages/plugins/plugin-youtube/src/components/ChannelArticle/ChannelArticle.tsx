//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { Obj } from '@dxos/echo';
import { Filter, useQuery } from '@dxos/react-client/echo';

import type { Channel, Video } from '../../types';

export type ChannelArticleProps = {
  subject: Channel.YouTubeChannel;
  attendableId?: string;
};

export const ChannelArticle = ({ subject: channel }: ChannelArticleProps) => {
  const videos = useQuery(channel.queue.target, Filter.all()) as Video.YouTubeVideo[];

  const sortedVideos = useMemo(
    () => [...videos].sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime()),
    [videos],
  );

  return (
    <div className='flex flex-col gap-4 p-4 overflow-auto'>
      <div className='flex items-center justify-between'>
        <h2 className='text-lg font-semibold'>{channel.name ?? 'YouTube Channel'}</h2>
        {channel.lastSyncedAt && (
          <span className='text-xs text-description'>
            Last synced: {new Date(channel.lastSyncedAt).toLocaleString()}
          </span>
        )}
      </div>

      {channel.channelUrl && (
        <div className='text-sm text-description'>
          <a href={channel.channelUrl} target='_blank' rel='noopener noreferrer' className='hover:underline'>
            {channel.channelUrl}
          </a>
        </div>
      )}

      <div className='flex flex-col gap-2'>
        <h3 className='text-md font-medium'>Videos ({sortedVideos.length})</h3>
        <div className='flex flex-col gap-2'>
          {sortedVideos.map((video) => (
            <div key={video.videoId} className='flex gap-3 p-2 rounded hover:bg-surface-hover'>
              {video.thumbnailUrl && (
                <img src={video.thumbnailUrl} alt={video.title} className='w-24 h-18 object-cover rounded' />
              )}
              <div className='flex flex-col gap-1 min-w-0'>
                <span className='font-medium truncate'>{video.title}</span>
                <span className='text-xs text-description'>
                  {new Date(video.publishedAt).toLocaleDateString()}
                  {video.transcript && ' • Transcript available'}
                </span>
              </div>
            </div>
          ))}
          {sortedVideos.length === 0 && (
            <p className='text-sm text-description'>No videos synced yet. Sync the channel to fetch videos.</p>
          )}
        </div>
      </div>
    </div>
  );
};
