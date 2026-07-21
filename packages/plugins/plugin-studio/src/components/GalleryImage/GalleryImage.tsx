//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Card, Icon } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type GalleryImageProps = {
  /** Resolved media `src` (a remote URL, or a `data:`/`blob:` URL for a file). */
  src?: string;
  /** Mime of the source — selects `<video>` vs `<img>`. */
  contentType?: string;
  alt?: string;
  classNames?: string;
};

/**
 * A single media tile rendered as a Card poster. Presentation-only — source already resolved. The
 * media box always reserves a 16:9 aspect ratio (so the tile has height before/without a load), and
 * `video/*` sources render as a muted `<video>` first-frame poster rather than a broken `<img>`.
 */
export const GalleryImage = ({ src, contentType, alt, classNames }: GalleryImageProps) => {
  const isVideo = contentType?.startsWith('video/') ?? false;
  return (
    <Card.Root classNames={mx('group relative', classNames)}>
      {/* col-span-full so the poster spans Card.Root's grid (icon|title|menu); fixed ratio reserves height. */}
      <div className='col-span-full overflow-hidden bg-modalSurface' style={{ aspectRatio: 16 / 9 }}>
        {src && isVideo ? (
          <video src={src} muted playsInline preload='metadata' className='block is-full bs-full object-cover' />
        ) : src ? (
          <img src={src} alt={alt ?? ''} loading='lazy' className='block is-full bs-full object-cover' />
        ) : (
          <div role='img' aria-label={alt} className='is-full bs-full' />
        )}
      </div>
      {alt ? (
        <Card.Header>
          <Card.Block>
            <Icon icon={isVideo ? 'ph--video--regular' : 'ph--image--regular'} size={5} />
          </Card.Block>
          <Card.Title classNames='text-description'>{alt}</Card.Title>
        </Card.Header>
      ) : null}
    </Card.Root>
  );
};
