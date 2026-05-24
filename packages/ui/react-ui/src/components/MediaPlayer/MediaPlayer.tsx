//
// Copyright 2026 DXOS.org
//

import React, { useState } from 'react';

import { mx } from '@dxos/ui-theme';

import { type ThemedClassName } from '../../util';

export type MediaKind = 'video' | 'audio';

const VIDEO_EXTENSIONS = ['.mp4', '.webm', '.ogv', '.mov', '.m4v'];
const AUDIO_EXTENSIONS = ['.mp3', '.wav', '.ogg', '.m4a', '.aac', '.flac'];

/** iframe sandbox flags compatible with typical oEmbed-style players. */
const DEFAULT_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation';

/**
 * Best-effort detection of `video` vs `audio` from a media URL.
 * Inspects the pathname's extension (ignoring query/hash). Returns `undefined`
 * when the URL doesn't look like a recognised media file — callers should
 * default to 'video' or render a fallback (e.g. iframe / img).
 */
export const detectMediaKind = (src: string): MediaKind | undefined => {
  // Strip query and hash, then take the last path segment's extension.
  const pathname = src.split(/[?#]/, 1)[0]!;
  const lower = pathname.toLowerCase();
  if (VIDEO_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return 'video';
  }
  if (AUDIO_EXTENSIONS.some((extension) => lower.endsWith(extension))) {
    return 'audio';
  }

  return undefined;
};

/**
 * Heuristic match for URLs that should render as native `<video>` / `<audio>`
 * (i.e. URLs ending in a recognised media extension).
 *
 * NB: Cloudflare Stream embed URLs serve an HTML player page, **not** a media
 * stream, so they cannot be loaded via `<video>`. Those are detected by
 * {@link isCloudflareStreamEmbed} and rendered via `<iframe>` instead.
 */
export const isEmbedUrl = (src: string): boolean => detectMediaKind(src) !== undefined;

/**
 * Match Cloudflare Stream `/iframe` embed URLs of the form
 * `https://customer-<code>.cloudflarestream.com/<32-hex-uid>/iframe[?…]`.
 */
const CLOUDFLARE_STREAM_IFRAME_PATTERN =
  /^https:\/\/[a-z0-9-]+\.cloudflarestream\.com\/[a-f0-9]{32}\/iframe(?:[/?#]|$)/i;

const isCloudflareStreamEmbed = (src: string): boolean => CLOUDFLARE_STREAM_IFRAME_PATTERN.test(src);

export type MediaPlayerProps = ThemedClassName<{
  src: string;
  /** Override auto-detection. When omitted, `detectMediaKind(src)` is used and falls back to 'video'. */
  kind?: MediaKind;
  controls?: boolean;
  autoPlay?: boolean;
  loop?: boolean;
  muted?: boolean;
  /** Accessible label for the `<video>` / `<audio>` element. */
  alt?: string;
  /** Defaults to 'anonymous' for cross-origin sources (e.g. signed S3 URLs). */
  crossOrigin?: 'anonymous' | 'use-credentials' | '';
  /** Additional classes applied only when rendering `<img>`. */
  imgClassNames?: string;
  /** Additional classes applied only when rendering native media or `<iframe>`. */
  mediaClassNames?: string;
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
  crossOrigin = 'anonymous',
  imgClassNames,
  mediaClassNames,
}: MediaPlayerProps) => {
  if (isEmbedUrl(src)) {
    const resolved = kind ?? detectMediaKind(src) ?? 'video';
    if (resolved === 'audio') {
      return (
        <audio
          className={mx('w-full', classNames, mediaClassNames)}
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
      <video
        className={mx('aspect-video max-w-full max-h-full', classNames, mediaClassNames)}
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

  if (isCloudflareStreamEmbed(src)) {
    return (
      <IframePlayer key={src} src={src} alt={alt} classNames={classNames} mediaClassNames={mediaClassNames} />
    );
  }

  return (
    <img
      src={src}
      alt={alt ?? ''}
      loading='lazy'
      className={mx(classNames, imgClassNames)}
      onError={(event) => {
        event.currentTarget.style.display = 'none';
      }}
    />
  );
};

type IframePlayerProps = ThemedClassName<{
  src: string;
  alt?: string;
  mediaClassNames?: string;
}>;

const IframePlayer = ({ src, alt, classNames, mediaClassNames }: IframePlayerProps) => {
  const [loaded, setLoaded] = useState(false);
  return (
    <div className={mx('relative bg-baseSurface', classNames)}>
      <iframe
        src={src}
        title={alt ?? 'Embedded media'}
        loading='lazy'
        className={mx(
          'border-none w-full h-full transition-opacity duration-150',
          loaded ? 'opacity-100' : 'opacity-0',
          mediaClassNames,
        )}
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
