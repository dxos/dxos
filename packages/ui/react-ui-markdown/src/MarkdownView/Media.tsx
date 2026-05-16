//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { MediaPlayer, detectMediaKind } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

/**
 * Heuristic match for embed URLs that should render as `MediaPlayer` (native
 * `<video>` / `<audio>`) instead of `<img>`. URLs ending in a recognised media
 * extension (mp4, mp3, …) qualify; legacy embed URLs containing the literal
 * `iframe` segment (Cloudflare Stream, oEmbed-style players) also qualify.
 */
export const isEmbedUrl = (src: string): boolean => detectMediaKind(src) !== undefined || src.includes('iframe');

export type MarkdownMediaProps = {
  src: string;
  /** Accessible label. */
  alt?: string;
  /** Classes applied to whichever element is rendered. */
  classNames?: string;
  /** Additional classes applied only when rendering `<img>`. */
  imgClassNames?: string;
  /** Additional classes applied only when rendering `MediaPlayer`. */
  mediaClassNames?: string;
};

/**
 * Render media referenced from markdown or a slide source. Returns a native
 * `MediaPlayer` (`<video>` / `<audio>`) when the URL looks like a playable
 * media source; otherwise an `<img>` that hides itself on load failure
 * (broken images are common in feeds and the placeholder is uglier than nothing).
 *
 * Shared by `MarkdownView`'s `img` component override and `Carousel.Media`
 * so both surfaces handle media URLs identically.
 */
export const MarkdownMedia = ({ src, alt, classNames, imgClassNames, mediaClassNames }: MarkdownMediaProps) => {
  if (isEmbedUrl(src)) {
    return <MediaPlayer src={src} alt={alt} classNames={mx(classNames, mediaClassNames)} />;
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
