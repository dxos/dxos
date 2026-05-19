//
// Copyright 2026 DXOS.org
//

import React from 'react';

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
 * NB: legacy embed URLs (Cloudflare Stream etc. — paths containing `iframe`)
 * serve an HTML player page, **not** a media stream, so they cannot be loaded
 * via `<video>`. Those are detected by {@link isLegacyIframeUrl} and rendered
 * via `<iframe>` instead.
 */
export const isEmbedUrl = (src: string): boolean => detectMediaKind(src) !== undefined;

const isLegacyIframeUrl = (src: string): boolean => src.includes('iframe');

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
 * - Legacy `iframe`-style embed URLs (Cloudflare Stream, oEmbed players) → `<iframe>`.
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
      <div className={mx('dx-container flex items-center justify-center', classNames, mediaClassNames)}>
        <video
          className='aspect-video max-w-full max-h-full'
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

  if (isLegacyIframeUrl(src)) {
    return (
      <iframe
        src={src}
        title={alt ?? 'Embedded media'}
        loading='lazy'
        className={mx('border-none', classNames, mediaClassNames)}
        sandbox={DEFAULT_IFRAME_SANDBOX}
        referrerPolicy='no-referrer'
        allow='accelerometer; gyroscope; autoplay; encrypted-media; picture-in-picture;'
        allowFullScreen
      />
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
