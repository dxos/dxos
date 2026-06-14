//
// Copyright 2025 DXOS.org
//

import React from 'react';

import { Card, Icon, IconButton, useTranslation } from '@dxos/react-ui';
import { File } from '@dxos/types';
import { mx } from '@dxos/ui-theme';

import { meta } from '#meta';

import { useImageUrl } from '../../hooks';

export type GalleryImageProps = {
  file: File.File | undefined;
  classNames?: string;
  onDelete?: () => void;
};

export const GalleryImage = ({ file, classNames, onDelete }: GalleryImageProps) => {
  const { t } = useTranslation(meta.id);
  const url = useImageUrl(file);
  const alt = file?.name ?? '';

  return (
    <Card.Root classNames={mx('group relative', classNames)}>
      {/* col-span-full so the image spans Card.Root's grid (icon|title|menu). */}
      <div className='col-span-full'>
        {url ? (
          <img src={url} alt={alt} loading='lazy' className='block w-full h-auto' />
        ) : (
          <div role='img' aria-label={alt} className='w-full bg-input' style={{ aspectRatio: 16 / 9 }} />
        )}
      </div>
      <Card.Header>
        <Icon icon='ph--image--regular' size={5} />
        <Card.Title>{file?.name ?? ''}</Card.Title>
        {onDelete && (
          <Card.Block end>
            <IconButton
              icon='ph--trash--regular'
              iconOnly
              variant='ghost'
              label={t('delete-image.label')}
              classNames='opacity-0 group-hover:opacity-100 focus-visible:opacity-100 transition-opacity'
              onClick={onDelete}
            />
          </Card.Block>
        )}
      </Card.Header>
    </Card.Root>
  );
};
