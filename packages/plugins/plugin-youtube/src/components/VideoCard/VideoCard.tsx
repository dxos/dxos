//
// Copyright 2024 DXOS.org
//

import React from 'react';

import { type SurfaceComponentProps } from '@dxos/app-toolkit/ui';
import { Card } from '@dxos/react-ui-mosaic';

import type { Video } from '../../types';

export const VideoCard = ({ subject: video }: SurfaceComponentProps<Video.YouTubeVideo>) => {
  const publishedDate = new Date(video.publishedAt).toLocaleDateString();
  const hasTranscript = Boolean(video.transcript);

  return (
    <Card.Content>
      <Card.Toolbar>
        {video.thumbnailUrl && (
          <Card.IconBlock>
            <img src={video.thumbnailUrl} alt={video.title} className='w-12 h-9 object-cover rounded' />
          </Card.IconBlock>
        )}
        <div className='flex gap-3 items-center justify-between col-span-2'>
          <p className='grow truncate font-medium'>{video.title}</p>
          <p className='text-xs text-description text-right whitespace-nowrap pie-2'>{publishedDate}</p>
        </div>
      </Card.Toolbar>
      <Card.Row>
        <p className='text-xs text-description'>{video.channelTitle}</p>
      </Card.Row>
      {video.description && (
        <Card.Row>
          <Card.Text variant='description'>{video.description.slice(0, 150)}...</Card.Text>
        </Card.Row>
      )}
      <Card.Row>
        <div className='flex gap-2 items-center'>
          {video.viewCount !== undefined && <span className='text-xs text-description'>{video.viewCount} views</span>}
          {hasTranscript && <span className='text-xs text-success'>Transcript available</span>}
        </div>
      </Card.Row>
    </Card.Content>
  );
};
