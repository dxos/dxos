//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { mx } from '@dxos/ui-theme';
import { type ThemedClassName } from '@dxos/ui-types';

import { type MediaKind, detectMediaKind, isEmbedUrl } from '../../../components/MediaPlayer/media-kind.ts';
import { recipes } from '../../recipes.ts';

export type MediaPlayerKind = MediaKind;

export type MediaPlayerFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

type MediaPlayerStatus = 'loading' | 'loaded' | 'error';

/** iframe sandbox flags compatible with typical oEmbed-style players. */
const IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation';

/** Cloudflare Stream `/iframe` embeds: `https://customer-<code>.cloudflarestream.com/<32-hex-uid>/iframe[?…]`. */
const CLOUDFLARE_STREAM_IFRAME_PATTERN =
  /^https:\/\/[a-z0-9-]+\.cloudflarestream\.com\/[a-f0-9]{32}\/iframe(?:[/?#]|$)/i;

export type MediaPlayerProps = ThemedClassName<{
  'src': string;
  /** Names the media (`aria-label`, an image's `alt`, an embed's `title`). */
  'alt'?: string;
  /** Forces native playback; otherwise detected from the URL's extension, and anything else is an image. */
  'kind'?: MediaPlayerKind;
  'controls'?: boolean;
  'autoPlay'?: boolean;
  'loop'?: boolean;
  'muted'?: boolean;
  /** CORS mode for `<video>`/`<audio>`; omitted by default, since forcing it breaks sources without CORS headers. */
  'crossOrigin'?: 'anonymous' | 'use-credentials' | '';
  /** `object-fit` of an image or video; `cover` by default. */
  'fit'?: MediaPlayerFit;
  /** Playback reached the end (`<video>`/`<audio>` only), what a playlist advances on. */
  'onEnded'?: () => void;
  'data-testid'?: string;
}>;

/**
 * A media URL in the element that plays it: native `<video>`/`<audio>` for media files, an `<iframe>` for Cloudflare
 * Stream embeds, and otherwise an `<img>` that disappears if it fails to load (a broken placeholder is worse than
 * nothing in a feed). The element itself is the part, so it fills whatever box the host gives it.
 */
export const MediaPlayer = ({
  classNames,
  src,
  alt,
  kind,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  crossOrigin,
  fit = 'cover',
  onEnded,
  'data-testid': testId,
}: MediaPlayerProps) => {
  // Keyed by source so a new `src` starts loading again without an effect racing the load event.
  const [result, setResult] = useState<{ src: string; status: MediaPlayerStatus }>();
  const status: MediaPlayerStatus = result?.src === src ? result.status : 'loading';

  // An explicit `kind` forces native playback even for extensionless URLs (e.g. `blob:`/`data:`).
  const resolved = kind || isEmbedUrl(src) ? (kind ?? detectMediaKind(src) ?? 'video') : undefined;
  const element = resolved ?? (CLOUDFLARE_STREAM_IFRAME_PATTERN.test(src) ? 'embed' : 'image');
  const partProps = {
    'data-scope': 'media-player',
    'data-part': 'root',
    'data-kind': element,
    'data-fit': fit,
    'data-status': status,
    'data-testid': testId,
    'className': mx(recipes.mediaPlayer(), classNames),
  };

  switch (element) {
    case 'audio':
    case 'video': {
      const Media = element;
      return (
        <Media
          {...partProps}
          src={src}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          crossOrigin={crossOrigin}
          aria-label={alt}
          onEnded={onEnded}
        />
      );
    }

    case 'embed':
      return (
        <iframe
          {...partProps}
          key={src}
          src={src}
          title={alt ?? 'Embedded media'}
          loading='lazy'
          sandbox={IFRAME_SANDBOX}
          referrerPolicy='no-referrer'
          allow='accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;'
          allowFullScreen
          onLoad={() => setResult({ src, status: 'loaded' })}
        />
      );

    default:
      return (
        <img
          {...partProps}
          src={src}
          alt={alt ?? ''}
          loading='lazy'
          onLoad={() => setResult({ src, status: 'loaded' })}
          onError={() => setResult({ src, status: 'error' })}
        />
      );
  }
};

MediaPlayer.displayName = 'Next.MediaPlayer';
