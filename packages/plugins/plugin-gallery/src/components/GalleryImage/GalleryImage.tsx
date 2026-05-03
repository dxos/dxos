//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card, Icon, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type Image } from '../../types/Gallery';

export type GalleryImageProps = {
  image: Image;
  /**
   * Pre-resolved URL for `<img src>`.
   * For `http(s)://` URLs this is just `image.url`.
   * For `wnfs://` URLs the caller resolves to a blob URL via `useImageUrl`.
   */
  url?: string;
  classNames?: string;
  onDelete?: () => void;
};

export const GalleryImage = ({ image, url, classNames, onDelete }: GalleryImageProps) => {
  const { t } = useTranslation(meta.id);
  const alt = image.description ?? image.name ?? '';

  // Aspect set inline (when dimensions are known) so the tile reserves the
  // correct height before the image loads — important for the masonry layout
  // to pack columns without reflow.
  const aspectRatio = image.width && image.height ? image.width / image.height : undefined;

  return (
    <Card.Root classNames={mx('group relative', classNames)}>
      {url ? (
        <img
          src={url}
          alt={alt}
          loading='lazy'
          width={image.width}
          height={image.height}
          className='block w-full h-auto'
          style={aspectRatio ? { aspectRatio } : undefined}
        />
      ) : (
        <div role='image' aria-label={alt} className='w-full bg-input' style={{ aspectRatio: aspectRatio ?? 16 / 9 }} />
      )}
      <Card.Toolbar>
        <Icon icon={image.description ? 'ph--text-aa--regular' : 'ph--image--regular'} size={5} />
        <Card.Title>{image.description ?? image.name ?? ''}</Card.Title>
        {onDelete && (
          <Toolbar.IconButton
            icon='ph--trash--regular'
            iconOnly
            variant='ghost'
            label={t('delete-image.label')}
            classNames='opacity-0 group-hover:opacity-100 transition-opacity'
            onClick={onDelete}
          />
        )}
      </Card.Toolbar>
    </Card.Root>
  );
};
