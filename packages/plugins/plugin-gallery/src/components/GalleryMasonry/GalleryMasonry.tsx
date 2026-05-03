//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type ComponentType, type PropsWithChildren, type ReactNode, useMemo } from 'react';

import { useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';

import { type Gallery, type Image } from '../../types/Gallery';
import { GalleryImage } from '../GalleryImage';

const GALLERY_MASONRY_NAME = 'GalleryMasonry';

export type GalleryMasonryTileProps = {
  image: Image;
  index: number;
  onDelete?: () => void;
};

export type GalleryMasonryTile = ComponentType<GalleryMasonryTileProps>;

type ContextValue = {
  gallery: Gallery;
  onDelete?: (index: number) => void;
  Tile: GalleryMasonryTile;
  emptyMessage?: ReactNode;
};

const [Provider, useGalleryMasonryContext] = createContext<ContextValue>(GALLERY_MASONRY_NAME);

const DefaultTile: GalleryMasonryTile = ({ image, onDelete }) => (
  <GalleryImage image={image} url={image.url} onDelete={onDelete} />
);

//
// Root
//
// Headless: provides context only — no DOM. Containers compose Panel.Root /
// Panel.Toolbar / Panel.Content around `GalleryMasonry.Viewport` themselves.
//

export type GalleryMasonryRootProps = PropsWithChildren<{
  gallery: Gallery;
  onDelete?: (index: number) => void;
  /** Render a single tile. Defaults to `GalleryImage` with `image.url` as src. */
  Tile?: GalleryMasonryTile;
  /** Custom empty-state node. Defaults to a translated message. */
  emptyMessage?: ReactNode;
}>;

const Root = ({ gallery, onDelete, Tile = DefaultTile, emptyMessage, children }: GalleryMasonryRootProps) => (
  <Provider gallery={gallery} onDelete={onDelete} Tile={Tile} emptyMessage={emptyMessage}>
    {children}
  </Provider>
);

Root.displayName = `${GALLERY_MASONRY_NAME}.Root`;

//
// Viewport
//
// Renders the masonry grid (or the empty state). Owns the `ScrollArea.Root`
// (via `Masonry.Content`). Containers wrap this in `Panel.Content` (or any
// other layout) themselves.
//

const Viewport = () => {
  const { t } = useTranslation(meta.id);
  const { gallery, onDelete, Tile, emptyMessage } = useGalleryMasonryContext(`${GALLERY_MASONRY_NAME}.Viewport`);
  const items = useMemo(() => (gallery.images ?? []).map((image, index) => ({ image, index })), [gallery.images]);

  if (items.length === 0) {
    return (
      <div role='status' className='flex items-center justify-center h-full text-subdued'>
        {emptyMessage ?? t('empty.message')}
      </div>
    );
  }

  return (
    <Masonry.Root
      Tile={({ data }: { data: { image: Image; index: number } }) => (
        <Tile image={data.image} index={data.index} onDelete={onDelete && (() => onDelete(data.index))} />
      )}
    >
      <Masonry.Content padding centered>
        <Masonry.Viewport
          items={items}
          getId={(data: { image: Image; index: number }) => `${data.index}:${data.image.url}`}
        />
      </Masonry.Content>
    </Masonry.Root>
  );
};

Viewport.displayName = `${GALLERY_MASONRY_NAME}.Viewport`;

//
// Namespace
//

export const GalleryMasonry = {
  Root,
  Viewport,
};
