//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { MediaPlayer, detectMediaKind } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * Heuristic match for URLs that should render as `MediaPlayer` (native
 * `<video>` / `<audio>`) instead of `<img>` — i.e. URLs ending in a recognised
 * media extension (mp4, mp3, …).
 *
 * NB: legacy embed URLs (Cloudflare Stream etc. — paths containing `iframe`)
 * serve an HTML player page, **not** a media stream, so they cannot be loaded
 * via `<video>`. Those are detected by {@link isLegacyIframeUrl} and rendered
 * via `<iframe>` below.
 */
export const isEmbedUrl = (src: string): boolean => detectMediaKind(src) !== undefined;

const isLegacyIframeUrl = (src: string): boolean => src.includes('iframe');

/** iframe sandbox flags compatible with typical oEmbed-style players. */
const DEFAULT_IFRAME_SANDBOX = 'allow-scripts allow-same-origin allow-presentation';

export type MarkdownMediaProps = {
  src: string;
  /** Accessible label. */
  alt?: string;
  /** Classes applied to whichever element is rendered. */
  classNames?: string;
  /** Additional classes applied only when rendering `<img>`. */
  imgClassNames?: string;
  /** Additional classes applied only when rendering `MediaPlayer` or `<iframe>`. */
  mediaClassNames?: string;
};

/**
 * Render media referenced from markdown or a slide source.
 * - Direct media URLs (mp4, mp3, …) → native `MediaPlayer`.
 * - Legacy `iframe`-style embed URLs (Cloudflare Stream, oEmbed players) → `<iframe>`.
 * - Everything else → `<img>` that hides itself on load failure (broken images
 *   are common in feeds and the placeholder is uglier than nothing).
 *
 * Shared by `MarkdownView`'s `img` component override and `Carousel.Media`
 * so both surfaces handle media URLs identically.
 */
export const MarkdownMedia = ({ src, alt, classNames, imgClassNames, mediaClassNames }: MarkdownMediaProps) => {
  if (isEmbedUrl(src)) {
    return <MediaPlayer src={src} alt={alt} classNames={mx(classNames, mediaClassNames)} />;
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
