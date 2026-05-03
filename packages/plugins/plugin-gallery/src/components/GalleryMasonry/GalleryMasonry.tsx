//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type ComponentType, type PropsWithChildren, type ReactNode, useMemo } from 'react';

import { Panel, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';

import { type Image } from '../../types/Gallery';
import { GalleryImage } from '../GalleryImage';

const GALLERY_MASONRY_NAME = 'GalleryMasonry';

export type GalleryMasonryTileProps = {
  image: Image;
  index: number;
  onDelete?: () => void;
};

export type GalleryMasonryTile = ComponentType<GalleryMasonryTileProps>;

type ContextValue = {
  images: ReadonlyArray<Image>;
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

export type GalleryMasonryRootProps = PropsWithChildren<{
  /** Article surface role forwarded to `Panel.Root`. */
  role?: string;
  images: ReadonlyArray<Image>;
  onDelete?: (index: number) => void;
  /** Render a single tile. Defaults to `GalleryImage` with `image.url` as src. */
  Tile?: GalleryMasonryTile;
  /** Custom empty-state node. Defaults to a translated message. */
  emptyMessage?: ReactNode;
}>;

const Root = ({ role, images, onDelete, Tile = DefaultTile, emptyMessage, children }: GalleryMasonryRootProps) => (
  <Provider images={images} onDelete={onDelete} Tile={Tile} emptyMessage={emptyMessage}>
    <Panel.Root role={role}>{children}</Panel.Root>
  </Provider>
);

Root.displayName = `${GALLERY_MASONRY_NAME}.Root`;

//
// Toolbar
//

const Toolbar = ({ children }: PropsWithChildren) => <Panel.Toolbar>{children}</Panel.Toolbar>;
Toolbar.displayName = `${GALLERY_MASONRY_NAME}.Toolbar`;

//
// Content
//

const Content = ({ children }: PropsWithChildren) => <Panel.Content>{children}</Panel.Content>;
Content.displayName = `${GALLERY_MASONRY_NAME}.Content`;

//
// Viewport
//

const Viewport = () => {
  const { t } = useTranslation(meta.id);
  const { images, onDelete, Tile, emptyMessage } = useGalleryMasonryContext(`${GALLERY_MASONRY_NAME}.Viewport`);

  const items = useMemo(() => images.map((image, index) => ({ image, index })), [images]);

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
      <Masonry.Content>
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
  Toolbar,
  Content,
  Viewport,
};
