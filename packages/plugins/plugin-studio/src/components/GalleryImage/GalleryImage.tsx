//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { Card, Icon } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

export type GalleryImageProps = {
  /** Resolved `<img src>` (a remote URL, or a `data:`/`blob:` URL for an uploaded file). */
  src?: string;
  alt?: string;
  classNames?: string;
};

/** A single image tile rendered as a Card poster. Presentation-only — source already resolved. */
export const GalleryImage = ({ src, alt, classNames }: GalleryImageProps) => (
  <Card.Root classNames={mx('group relative', classNames)}>
    {/* col-span-full so the image spans Card.Root's grid (icon|title|menu). */}
    <div className='col-span-full'>
      {src ? (
        <img src={src} alt={alt ?? ''} loading='lazy' className='block is-full bs-auto' />
      ) : (
        <div role='img' aria-label={alt} className='is-full bg-modalSurface' style={{ aspectRatio: 16 / 9 }} />
      )}
    </div>
    {alt ? (
      <Card.Header>
        <Card.Block>
          <Icon icon='ph--image--regular' size={5} />
        </Card.Block>
        <Card.Title classNames='text-description'>{alt}</Card.Title>
      </Card.Header>
    ) : null}
  </Card.Root>
);
