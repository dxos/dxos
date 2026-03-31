//
// Copyright 2024 DXOS.org
//

import React, { useMemo } from 'react';

import { type Feed, Obj, Query } from '@dxos/echo';
import { Filter, useObject, useQuery } from '@dxos/react-client/echo';
import { Icon, Panel } from '@dxos/react-ui';

import * as Channel from '../../types/Channel';
import * as Video from '../../types/Video';

export type ChannelArticleProps = {
  subject: Channel.YouTubeChannel;
  attendableId?: string;
};

export const ChannelArticle = ({ subject: channel }: ChannelArticleProps) => {
  useObject(channel);
  const feed = channel.feed?.target as Feed.Feed | undefined;
  const db = Obj.getDatabase(channel);
  const videos = useQuery(
    db,
    feed ? Query.select(Filter.type(Video.YouTubeVideo)).from(feed) : Query.select(Filter.nothing()),
  ) as Video.YouTubeVideo[];

  const sortedVideos = useMemo(
    () =>
      [...videos].sort(
        (videoA, videoB) => new Date(videoB.publishedAt).getTime() - new Date(videoA.publishedAt).getTime(),
      ),
    [videos],
  );

  return (
    <Panel.Root>
      <Panel.Content className='overflow-auto'>
        <div className='flex flex-col gap-4 p-4'>
          <div className='flex items-center justify-between'>
            <div className='flex items-center gap-2'>
              <Icon icon='ph--youtube-logo--regular' size={6} />
              <h2 className='text-lg font-semibold'>{channel.name ?? 'YouTube Channel'}</h2>
            </div>
            {channel.lastSyncedAt && (
              <span className='text-xs text-description'>
                Last synced: {new Date(channel.lastSyncedAt).toLocaleString()}
              </span>
            )}
          </div>

          {channel.channelUrl && (
            <div className='text-sm text-description'>
              <a
                href={
                  channel.channelUrl.startsWith('http')
                    ? channel.channelUrl
                    : `https://www.youtube.com/@${channel.channelUrl}`
                }
                target='_blank'
                rel='noopener noreferrer'
                className='hover:underline'
              >
                {channel.channelUrl}
              </a>
            </div>
          )}

          <div className='flex flex-col gap-2'>
            <h3 className='text-md font-medium'>Videos ({sortedVideos.length})</h3>
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'>
              {sortedVideos.map((video) => (
                <div key={video.videoId} className='flex flex-col gap-2 p-2 rounded hover:bg-surface-hover'>
                  {video.thumbnailUrl ? (
                    <a
                      href={video.url}
                      target='_blank'
                      rel='noopener noreferrer'
                      className='relative aspect-video group'
                    >
                      <img src={video.thumbnailUrl} alt={video.title} className='h-full w-full object-cover rounded' />
                      <div className='absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 rounded transition-colors'>
                        <div className='opacity-0 group-hover:opacity-100 bg-red-600 text-white rounded-full p-2 transition-opacity'>
                          <Icon icon='ph--play--fill' size={4} />
                        </div>
                      </div>
                    </a>
                  ) : (
                    <div className='aspect-video bg-surface-hover rounded flex items-center justify-center'>
                      <Icon icon='ph--video--regular' size={8} />
                    </div>
                  )}
                  <div className='flex flex-col gap-1'>
                    <span className='font-medium line-clamp-2' title={video.title}>
                      {video.title}
                    </span>
                    <span className='text-xs text-description'>
                      {new Date(video.publishedAt).toLocaleDateString()}
                      {video.transcript && ' • Transcript available'}
                    </span>
                  </div>
                </div>
              ))}
              {sortedVideos.length === 0 && (
                <div className='col-span-full text-sm text-description p-4 text-center'>
                  No videos synced yet. Sync the channel to fetch videos.
                </div>
              )}
            </div>
          </div>
        </div>
      </Panel.Content>
    </Panel.Root>
  );
};
