//
// Copyright 2024 DXOS.org
//

import React, { useState } from 'react';

import { type AppSurface } from '@dxos/app-toolkit/ui';
import { Icon, Panel } from '@dxos/react-ui';

import * as Video from '../../types/Video';

export type VideoArticleProps = AppSurface.ObjectArticleProps<Video.YouTubeVideo>;

export const VideoArticle = ({ subject: video, role }: VideoArticleProps) => {
  const [showPlayer, setShowPlayer] = useState(false);
  const publishedDate = new Date(video.publishedAt).toLocaleDateString();
  const hasTranscript = Boolean(video.transcript);
  const embedUrl = `https://www.youtube.com/embed/${video.videoId}`;

  return (
    <Panel.Root>
      <Panel.Content className={role === 'section' ? 'overflow-auto' : ''}>
        <div className='flex flex-col gap-4 p-4 max-w-4xl'>
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

          <div className='aspect-video w-full max-w-2xl'>
            {showPlayer ? (
              <iframe
                src={embedUrl}
                title={video.title}
                allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
                allowFullScreen
                className='h-full w-full rounded-lg'
              />
            ) : (
              <button
                type='button'
                onClick={() => setShowPlayer(true)}
                className='relative h-full w-full group cursor-pointer'
              >
                {video.thumbnailUrl ? (
                  <img src={video.thumbnailUrl} alt={video.title} className='h-full w-full object-cover rounded-lg' />
                ) : (
                  <div className='h-full w-full bg-surface-hover rounded-lg flex items-center justify-center'>
                    <Icon icon='ph--play--fill' size={12} />
                  </div>
                )}
                <div className='absolute inset-0 flex items-center justify-center bg-black/30 group-hover:bg-black/50 rounded-lg transition-colors'>
                  <div className='bg-red-600 text-white rounded-full p-4 group-hover:scale-110 transition-transform'>
                    <Icon icon='ph--play--fill' size={8} />
                  </div>
                </div>
              </button>
            )}
          </div>

          {video.description && (
            <div className='max-w-2xl'>
              <h3 className='text-md font-medium mb-2'>Description</h3>
              <p className='whitespace-pre-wrap text-sm'>{video.description}</p>
            </div>
          )}

          {hasTranscript && (
            <div className='max-w-2xl'>
              <h3 className='text-md font-medium mb-2'>Transcript</h3>
              <div className='bg-surface-input p-4 rounded-lg max-h-96 overflow-auto'>
                <p className='whitespace-pre-wrap text-sm'>{video.transcript}</p>
              </div>
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
      </Panel.Content>
    </Panel.Root>
  );
};
