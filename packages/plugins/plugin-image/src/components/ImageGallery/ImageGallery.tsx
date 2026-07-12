//
// Copyright 2026 DXOS.org
//

import React, { type ReactNode, useMemo } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';

import { type ImageSource, useImageSource } from '../../hooks';
import { GalleryImage } from '../GalleryImage';

export type { ImageSource };

export type ImageGalleryProps = {
  images: ReadonlyArray<ImageSource>;
  emptyMessage?: ReactNode;
};

type TileData = { image: ImageSource; index: number };

const Tile = ({ data }: { data?: TileData }) => {
  // Resolve the source (URL or uploaded-file blob). Hook is called unconditionally.
  const src = useImageSource(data?.image);
  if (!data) {
    return null;
  }
  return <GalleryImage src={src} alt={data.image.name} />;
};

/**
 * A masonry gallery of images — remote URLs and/or uploaded `File.File` blobs. Vendored from
 * `plugin-gallery`'s `Lightbox` and generalized so no `Gallery` ECHO object is required.
 * Presentation-only (each tile resolves its own source via {@link useImageSource}).
 */
export const ImageGallery = ({ images, emptyMessage }: ImageGalleryProps) => {
  const { t } = useTranslation(meta.profile.key);
  const items = useMemo(() => images.map((image, index) => ({ image, index })), [images]);

  if (items.length === 0) {
    return (
      <div role='status' className='flex items-center justify-center bs-full text-subdued'>
        {emptyMessage ?? t('empty.message')}
      </div>
    );
  }

  return (
    <Masonry.Root Tile={Tile}>
      <Masonry.Content centered>
        <Masonry.Viewport
          items={items}
          getId={(data?: TileData) => data?.image.url ?? data?.image.file?.uri ?? String(data?.index ?? '')}
        />
      </Masonry.Content>
    </Masonry.Root>
  );
};
