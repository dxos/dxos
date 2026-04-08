//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Card, Icon } from '@dxos/react-ui';

import * as Video from '../../types/Video';

export type VideoCardProps = AppSurface.ObjectCardProps<Video.YouTubeVideo>;

/**
 * YouTube video card with embedded player.
 */
export const VideoCard = ({ subject: video }: VideoCardProps) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const publishedDate = new Date(video.publishedAt).toLocaleDateString();
  const hasTranscript = Boolean(video.transcript);

  const embedUrl = `https://www.youtube.com/embed/${video.videoId}?autoplay=1`;

  return (
    <Card.Content>
      {showPlayer ? (
        <div className='aspect-video w-full'>
          <iframe
            src={embedUrl}
            title={video.title}
            allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
            allowFullScreen
            className='h-full w-full rounded'
          />
        </div>
      ) : (
        <button
          type='button'
          onClick={() => setShowPlayer(true)}
          className='relative aspect-video w-full group cursor-pointer'
        >
          {video.thumbnailUrl ? (
            <img src={video.thumbnailUrl} alt={video.title} className='h-full w-full object-cover rounded' />
          ) : (
            <div className='h-full w-full bg-surface-hover rounded flex items-center justify-center'>
              <Icon icon='ph--play--fill' size={12} />
            </div>
          )}
          <div className='absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 rounded transition-colors'>
            <div className='bg-red-600 text-white rounded-full p-3 group-hover:scale-110 transition-transform'>
              <Icon icon='ph--play--fill' size={6} />
            </div>
          </div>
        </button>
      )}
      <Card.Toolbar>
        <Card.IconBlock>
          <Icon icon='ph--youtube-logo--regular' size={5} />
        </Card.IconBlock>
        <div className='flex gap-3 items-center justify-between col-span-2'>
          <span className='grow truncate font-medium'>{video.title}</span>
          <span className='text-xs text-description text-right whitespace-nowrap pe-2'>{publishedDate}</span>
        </div>
      </Card.Toolbar>
      <Card.Row>
        <span className='text-xs text-description'>{video.channelTitle}</span>
      </Card.Row>
      {video.description && (
        <Card.Row>
          <Card.Text variant='description'>{video.description.slice(0, 150)}...</Card.Text>
        </Card.Row>
      )}
      <Card.Row>
        <div className='flex gap-2 items-center text-xs text-description'>
          {video.viewCount !== undefined && <span>{video.viewCount.toLocaleString()} views</span>}
          {hasTranscript && (
            <>
              <span>•</span>
              <span className='text-green-600'>Transcript available</span>
            </>
          )}
        </div>
      </Card.Row>
    </Card.Content>
  );
};
