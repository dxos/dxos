//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card, Toolbar, useTranslation } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { type Image } from '../../types/Gallery';
import { useImageUrl } from '../useImageUrl';

export type GalleryImageProps = {
  image: Image;
  classNames?: string;
  onDelete?: () => void;
};

export const GalleryImage = ({ image, classNames, onDelete }: GalleryImageProps) => {
  const { t } = useTranslation(meta.id);
  const url = useImageUrl(image.url, image.type);
  const alt = image.description ?? image.name ?? '';

  return (
    <Card.Root classNames={mx('group relative', classNames)}>
      {url && <Card.Poster image={url} alt={alt} aspect='auto' fit='cover' />}
      <Card.Toolbar>
        <Card.Title>{image.name ?? image.description ?? ''}</Card.Title>
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
