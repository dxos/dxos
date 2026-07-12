//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type ReactNode, useMemo } from 'react';

import { Icon, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';

import { type ImageSource, useImageSource } from '../../hooks';
import { GalleryImage } from '../GalleryImage';

export type { ImageSource };

export type ImageGalleryProps = {
  images: ReadonlyArray<ImageSource>;
  emptyMessage?: ReactNode;
  /** Ids of selected tiles (keyed by {@link ImageSource.id}). Enables the selection outline. */
  selectedIds?: ReadonlySet<string>;
  /** Emitted when a tile is clicked; the container toggles its selection state. */
  onSelect?: (id: string, event: MouseEvent) => void;
};

/** Stable per-tile id: the backing Image id, else the url / file DXN, else the index. */
const sourceId = (image: ImageSource, index: number): string =>
  image.id ?? image.url ?? image.file?.uri ?? String(index);

type TileData = { image: ImageSource; index: number };

const Tile = ({ data, selected }: { data?: TileData; selected?: boolean }) => {
  // Resolve the source (URL or uploaded-file blob). Hook is called unconditionally.
  const src = useImageSource(data?.image);
  if (!data) {
    return null;
  }
  return (
    <div className='relative'>
      <GalleryImage src={src} alt={data.image.name} />
      {selected && (
        <Icon
          icon='ph--check-circle--fill'
          size={6}
          classNames='absolute block-start-1 inline-end-1 text-primary-500 bg-baseSurface rounded-full'
        />
      )}
    </div>
  );
};

/**
 * A masonry gallery of images — remote URLs and/or uploaded `File.File` blobs. Vendored from
 * `plugin-gallery`'s `Lightbox` and generalized so no `Gallery` ECHO object is required.
 * Presentation-only (each tile resolves its own source via {@link useImageSource}); selection state
 * is owned by the container (see `useListSelection`).
 */
export const ImageGallery = ({ images, emptyMessage, selectedIds, onSelect }: ImageGalleryProps) => {
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
          getId={(data?: TileData) => (data ? sourceId(data.image, data.index) : '')}
          selectedIds={selectedIds}
          onSelect={onSelect}
        />
      </Masonry.Content>
    </Masonry.Root>
  );
};
