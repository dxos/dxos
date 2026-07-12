//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { type Ref } from '@dxos/echo';
import { useTranslation } from '@dxos/react-ui';
import { type File } from '@dxos/types';

import { meta } from '#meta';

import { useImageSource } from '../../hooks';

/** A single image plus its provenance metadata. */
export type ImageViewData = {
  url?: string;
  file?: Ref.Ref<File.File>;
  prompt?: string;
  model?: string;
  resolution?: string;
  seed?: number;
};

export type ImageViewProps = {
  image?: ImageViewData;
};

/** A single image (generated URL or uploaded file) with its provenance metadata. Presentation-only. */
export const ImageView = ({ image }: ImageViewProps) => {
  const { t } = useTranslation(meta.profile.key);
  // Resolve the source unconditionally (hook order).
  const src = useImageSource(image);

  if (!image) {
    return (
      <div role='status' className='flex items-center justify-center bs-full text-subdued'>
        {t('empty.message')}
      </div>
    );
  }

  const facts = [
    image.model && `${t('model.label')}: ${image.model}`,
    image.resolution && `${t('resolution.label')}: ${image.resolution}`,
    image.seed !== undefined && `${t('seed.label')}: ${image.seed}`,
  ].filter(Boolean);

  return (
    <div className='flex flex-col gap-2 p-2 overflow-auto'>
      {src && <img src={src} alt={image.prompt ?? ''} className='block max-is-full bs-auto mli-auto rounded' />}
      {facts.length > 0 && <div className='text-xs text-description text-center'>{facts.join(' · ')}</div>}
    </div>
  );
};
