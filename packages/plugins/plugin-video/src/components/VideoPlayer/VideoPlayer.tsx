//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Icon, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

export type VideoPlayerProps = {
  url?: string;
  classNames?: string | string[];
};

/**
 * Embedded video player. Derives an embeddable iframe `src` from common providers
 * (YouTube, Vimeo) and falls back to the raw URL.
 */
export const VideoPlayer = ({ url, classNames }: VideoPlayerProps) => {
  const { t } = useTranslation(meta.id);
  const embedUrl = url ? toEmbedUrl(url) : undefined;

  if (!embedUrl) {
    return (
      <div
        className={mx('flex flex-col items-center justify-center gap-2 text-description aspect-video', classNames)}
      >
        <Icon icon='ph--video-camera-slash--regular' size={8} />
        <span>{t('player.empty.label')}</span>
      </div>
    );
  }

  return (
    <div className={mx('flex flex-col gap-1', classNames)}>
      <iframe
        className='is-full aspect-video rounded border border-separator bg-black'
        src={embedUrl}
        title={url}
        allow='accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture'
        allowFullScreen
      />
      <a className='self-end text-xs text-description hover:text-accent-text' href={url} target='_blank' rel='noreferrer'>
        {t('player.open-original.label')}
      </a>
    </div>
  );
};

/**
 * Maps a video URL to an embeddable iframe URL. Recognises YouTube and Vimeo;
 * returns the original URL for anything else.
 */
export const toEmbedUrl = (url: string): string | undefined => {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return undefined;
  }

  const host = parsed.hostname.replace(/^www\./, '');

  // YouTube.
  if (host === 'youtu.be') {
    const id = parsed.pathname.slice(1);
    return id ? `https://www.youtube.com/embed/${id}` : undefined;
  }
  if (host === 'youtube.com' || host === 'm.youtube.com') {
    if (parsed.pathname.startsWith('/embed/')) {
      return parsed.toString();
    }
    const id = parsed.searchParams.get('v');
    return id ? `https://www.youtube.com/embed/${id}` : undefined;
  }

  // Vimeo.
  if (host === 'vimeo.com') {
    const id = parsed.pathname.split('/').filter(Boolean)[0];
    return id ? `https://player.vimeo.com/video/${id}` : undefined;
  }
  if (host === 'player.vimeo.com') {
    return parsed.toString();
  }

  // Fall back to the raw URL (e.g. a direct media file or an already-embeddable URL).
  return parsed.toString();
};
