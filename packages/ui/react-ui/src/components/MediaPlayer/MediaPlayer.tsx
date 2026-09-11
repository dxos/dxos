//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { mx } from '@dxos/ui-theme';

import { type ThemedClassName } from '../../util/index.ts';
import { type MediaKind, detectMediaKind, isEmbedUrl } from './media-kind.ts';

export type MediaFit = 'cover' | 'contain' | 'fill' | 'none' | 'scale-down';

/** Static map to keep Tailwind's class scanner happy (no dynamic `object-${fit}`). */
const FIT_CLASS: Record<MediaFit, string> = {
  'cover': 'object-cover',
  'contain': 'object-contain',
  'fill': 'object-fill',
  'none': 'object-none',
  'scale-down': 'object-scale-down',
};

/** iframe sandbox flags compatible with typical oEmbed-style players. */
const DEFAULT_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation';

/**
 * Match Cloudflare Stream `/iframe` embed URLs of the form
 * `https://customer-<code>.cloudflarestream.com/<32-hex-uid>/iframe[?…]`.
 */
const CLOUDFLARE_STREAM_IFRAME_PATTERN =
  /^https:\/\/[a-z0-9-]+\.cloudflarestream\.com\/[a-f0-9]{32}\/iframe(?:[/?#]|$)/i;

const isCloudflareStreamEmbed = (src: string): boolean => CLOUDFLARE_STREAM_IFRAME_PATTERN.test(src);

export type MediaPlayerProps = ThemedClassName<{
  src: string;
  alt?: string;
  /** Override auto-detection. When omitted, `detectMediaKind(src)` is used and falls back to 'video'. */
  kind?: MediaKind;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  /**
   * CORS mode for `<video>`/`<audio>`. Omitted by default — plain playback needs no CORS, and
   * forcing it breaks sources whose response/redirect lacks `access-control-allow-origin` (e.g.
   * Cloudflare Stream's signed MP4 redirect). Set 'anonymous' only when reading frames into a canvas.
   */
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  /** CSS `object-fit` for `<img>` and `<video>`. Ignored for `<iframe>`/`<audio>`. Defaults to 'cover'. */
  fit?: MediaFit;
}>;

/**
 * Renders a media URL using the appropriate element:
 * - Direct media URLs (mp4, mp3, …) → native `<video>` / `<audio>`.
 * - Cloudflare Stream `/iframe` embed URLs → `<iframe>`.
 * - Everything else → `<img>` that hides itself on load failure (broken images
 *   are common in feeds and the placeholder is uglier than nothing).
 */
export const MediaPlayer = ({
  classNames,
  src,
  kind,
  controls = true,
  autoPlay = false,
  loop = false,
  muted = false,
  alt,
  crossOrigin,
  fit = 'cover',
}: MediaPlayerProps) => {
  const fitClass = FIT_CLASS[fit];
  // An explicit `kind` forces native playback even for extensionless URLs (e.g. `blob:`/`data:`).
  if (kind || isEmbedUrl(src)) {
    const resolved = kind ?? detectMediaKind(src) ?? 'video';
    if (resolved === 'audio') {
      return (
        <audio
          className={mx('w-full', classNames)}
          src={src}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          crossOrigin={crossOrigin}
          aria-label={alt}
        />
      );
    }

    return (
      <div className={mx('grid place-items-center', classNames)}>
        <video
          className={mx('max-w-full max-h-full aspect-video', fitClass)}
          src={src}
          controls={controls}
          autoPlay={autoPlay}
          loop={loop}
          muted={muted}
          crossOrigin={crossOrigin}
          aria-label={alt}
        />
      </div>
    );
  }

  if (isCloudflareStreamEmbed(src)) {
    return <IframePlayer key={src} classNames={classNames} src={src} alt={alt} />;
  }

  return (
    <img
      className={mx(fitClass, classNames)}
      src={src}
      alt={alt ?? ''}
      loading='lazy'
      onError={(event) => {
        event.currentTarget.style.display = 'none';
      }}
    />
  );
};

type IframePlayerProps = ThemedClassName<{
  src: string;
  alt?: string;
}>;

const IframePlayer = ({ src, alt, classNames }: IframePlayerProps) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={mx('relative bg-base-surface', classNames)}>
      <iframe
        src={src}
        title={alt ?? 'Embedded media'}
        loading='lazy'
        className={mx('border-none dx-fill transition-opacity duration-150', loaded ? 'opacity-100' : 'opacity-0')}
        style={{ colorScheme: 'dark' }}
        sandbox={DEFAULT_IFRAME_SANDBOX}
        referrerPolicy='no-referrer'
        allow='accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;'
        allowFullScreen
        onLoad={() => setLoaded(true)}
      />
    </div>
  );
};
