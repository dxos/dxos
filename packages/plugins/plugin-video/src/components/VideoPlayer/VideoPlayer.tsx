//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, composable, composableProps, useTranslation } from '@dxos/react-ui';

import { meta } from '#meta';

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
    const { t } = useTranslation(meta.id);
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

/**
 * Maps a video URL to an embeddable iframe URL. Recognises YouTube and Vimeo;
 * returns the original URL for anything else. When `startTime` (seconds) is set, the embed
 * starts at that offset and autoplays.
 */
export const toEmbedUrl = (url: string, startTime?: number): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  const host = parsed.hostname.replace(/^www\./, '');
  const start = startTime != null && Number.isFinite(startTime) ? Math.max(0, Math.floor(startTime)) : undefined;

  // YouTube (watch / short links).
  const youTubeId =
    host === 'youtu.be'
      ? parsed.pathname.slice(1)
      : (host === 'youtube.com' || host === 'm.youtube.com') && !parsed.pathname.startsWith('/embed/')
        ? parsed.searchParams.get('v')
        : undefined;
  if (youTubeId) {
    const params = new URLSearchParams();
    if (start !== undefined) {
      params.set('start', String(start));
      params.set('autoplay', '1');
    }
    const query = params.toString();
    return `https://www.youtube.com/embed/${youTubeId}${query ? `?${query}` : ''}`;
  }
  // YouTube (already an embed URL).
  if ((host === 'youtube.com' || host === 'm.youtube.com') && parsed.pathname.startsWith('/embed/')) {
    if (start !== undefined) {
      parsed.searchParams.set('start', String(start));
      parsed.searchParams.set('autoplay', '1');
    }
    return parsed.toString();
  }

  // Vimeo.
  const vimeoId = host === 'vimeo.com' ? parsed.pathname.split('/').filter(Boolean)[0] : undefined;
  if (vimeoId) {
    return `https://player.vimeo.com/video/${vimeoId}${start !== undefined ? `?autoplay=1#t=${start}s` : ''}`;
  }
  if (host === 'player.vimeo.com') {
    if (start !== undefined) {
      parsed.searchParams.set('autoplay', '1');
      parsed.hash = `#t=${start}s`;
    }
    return parsed.toString();
  }

  // Fall back to the raw URL (e.g. a direct media file or an already-embeddable URL).
  if (start !== undefined) {
    parsed.hash = `#t=${start}`;
  }
  return parsed.toString();
};
