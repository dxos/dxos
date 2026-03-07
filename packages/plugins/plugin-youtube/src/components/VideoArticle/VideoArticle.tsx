//
// Copyright 2024 DXOS.org
//

import React from 'react';

import type { Channel, Video } from '../../types';

export type VideoArticleProps = {
  role: string | string[];
  subject: Video.YouTubeVideo;
  channel: Channel.YouTubeChannel;
};

export const VideoArticle = ({ subject: video, channel }: VideoArticleProps) => {
  const publishedDate = new Date(video.publishedAt).toLocaleDateString();
  const hasTranscript = Boolean(video.transcript);

  return (
    <div className='flex flex-col gap-4 p-4 overflow-auto'>
      <div className='flex flex-col gap-2'>
        <h2 className='text-lg font-semibold'>{video.title}</h2>
        <div className='flex items-center gap-2 text-sm text-description'>
          <span>{video.channelTitle}</span>
          <span>•</span>
          <span>{publishedDate}</span>
          {video.viewCount !== undefined && (
            <>
              <span>•</span>
              <span>{video.viewCount.toLocaleString()} views</span>
            </>
          )}
          {video.likeCount !== undefined && (
            <>
              <span>•</span>
              <span>{video.likeCount.toLocaleString()} likes</span>
            </>
          )}
        </div>
      </div>

      {video.thumbnailUrl && (
        <div className='aspect-video w-full max-w-2xl'>
          <a href={video.url} target='_blank' rel='noopener noreferrer'>
            <img src={video.thumbnailUrl} alt={video.title} className='w-full h-full object-cover rounded-lg' />
          </a>
        </div>
      )}

      {video.description && (
        <div className='prose prose-sm max-w-2xl'>
          <h3 className='text-md font-medium'>Description</h3>
          <p className='whitespace-pre-wrap text-sm'>{video.description}</p>
        </div>
      )}

      {hasTranscript && (
        <div className='prose prose-sm max-w-2xl'>
          <h3 className='text-md font-medium'>Transcript</h3>
          <p className='whitespace-pre-wrap text-sm'>{video.transcript}</p>
        </div>
      )}

      <a
        href={video.url}
        target='_blank'
        rel='noopener noreferrer'
        className='inline-flex items-center gap-2 text-sm text-primary hover:underline'
      >
        Watch on YouTube →
      </a>
    </div>
  );
};
