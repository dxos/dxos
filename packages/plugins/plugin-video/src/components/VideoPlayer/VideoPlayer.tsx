//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, composable, composableProps, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

import { toEmbedUrl } from './embed-url-parsers';

export type VideoPlayerProps = {
  url?: string;
  /** Seconds offset to start playback at; changing it reloads the player at that position. */
  startTime?: number;
};

/**
 * Embedded video player. Derives an embeddable iframe `src` from common providers
 * (YouTube, Vimeo) and falls back to the raw URL. Composable: forwards its ref and
 * merges slot props onto the root element.
 */
export const VideoPlayer = composable<HTMLDivElement, VideoPlayerProps>(
  ({ url, startTime, ...props }, forwardedRef) => {
    const { t } = useTranslation(meta.profile.key);
    const embedUrl = url ? toEmbedUrl(url, startTime) : undefined;

    if (!embedUrl) {
      return (
        <div
          {...composableProps(props, {
            classNames: 'flex flex-col items-center justify-center gap-2 text-description aspect-video',
          })}
          ref={forwardedRef}
        >
          <Icon icon='ph--video-camera-slash--regular' size={8} />
          <span>{t('player.empty.label')}</span>
        </div>
      );
    }

    return (
      <div {...composableProps(props, { classNames: 'aspect-video' })} ref={forwardedRef}>
        <iframe
          // Reload the player when the start offset changes (bare iframe has no seek API).
          key={startTime}
          className='w-full h-full'
          src={embedUrl}
          title={url}
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
          allowFullScreen
        />
      </div>
    );
  },
);
