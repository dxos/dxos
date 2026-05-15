//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { mx } from '@dxos/ui-theme';

/**
 * Heuristic match for embed URLs that should render as `<iframe>` instead of
 * `<img>`. Cloudflare Stream embeds (and other oEmbed-style iframes) include
 * the `iframe` segment in their URL.
 */
export const isEmbedUrl = (src: string): boolean => src.includes('iframe');

export type MarkdownMediaProps = {
  src: string;
  /** Accessible label / iframe title. */
  alt?: string;
  /** Classes applied to whichever element is rendered. */
  classNames?: string;
  /** Additional classes applied only when rendering `<img>`. */
  imgClassNames?: string;
  /** Additional classes applied only when rendering `<iframe>`. */
  iframeClassNames?: string;
};

/**
 * Render media referenced from markdown or a slide source. Returns an `<iframe>`
 * when the URL looks like an embed (see {@link isEmbedUrl}); otherwise an
 * `<img>` that hides itself on load failure (broken images are common in feeds
 * and the placeholder is uglier than nothing).
 *
 * Shared by `MarkdownView`'s `img` component override and `Carousel.Media`
 * so both surfaces handle iframe URLs identically.
 */
export const MarkdownMedia = ({ src, alt, classNames, imgClassNames, iframeClassNames }: MarkdownMediaProps) => {
  if (isEmbedUrl(src)) {
    return (
      <iframe
        src={src}
        title={alt}
        loading='lazy'
        className={mx('border-none', classNames, iframeClassNames)}
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
