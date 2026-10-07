//
// Copyright 2026 DXOS.org
//

import React from 'react';

import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Util from '@dxos/react-ui/Util';

import { meta } from '#meta';

import { toEmbedUrl } from './embed-url-parsers.ts';

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
export const VideoPlayer = Util.composable<HTMLDivElement, VideoPlayerProps>(
  ({ url, startTime, ...props }, forwardedRef) => {
    const { t } = Hooks.useTranslation(meta.profile.key);
    const embedUrl = url ? toEmbedUrl(url, startTime) : undefined;

    if (!embedUrl) {
      return (
        <div
          {...Util.composableProps(props, {
            classNames: 'flex flex-col items-center justify-center gap-2 text-fg-muted aspect-video',
          })}
          ref={forwardedRef}
        >
          <Icon.Icon icon='ph--video-camera-slash--regular' size='xl' />
          <span>{t('player.empty.label')}</span>
        </div>
      );
    }

    return (
      <div {...Util.composableProps(props, { classNames: 'aspect-video' })} ref={forwardedRef}>
        <iframe
          // Reload the player when the start offset changes (bare iframe has no seek API).
          key={startTime}
          className='dx-fill'
          src={embedUrl}
          title={url}
          allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
          allowFullScreen
        />
      </div>
    );
  },
);
