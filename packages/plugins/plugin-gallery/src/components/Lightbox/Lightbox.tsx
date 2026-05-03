//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type ComponentType, type PropsWithChildren, type ReactNode, useMemo } from 'react';

import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { composable, composableProps } from '@dxos/ui-theme';

import { meta } from '#meta';
import { Gallery } from '#types';

import { GalleryImage } from '../GalleryImage';

const LIGHTBOX_NAME = 'Lightbox';

type ContextValue = {
  gallery: Gallery.Gallery;
  onDelete?: (index: number) => void;
  Tile: ComponentType<LightboxTileProps>;
  emptyMessage?: ReactNode;
};

const [Provider, useLightboxContext] = createContext<ContextValue>(LIGHTBOX_NAME);

//
// Tile
//

type LightboxTileProps = {
  image: Gallery.Image;
  index: number;
  onDelete?: () => void;
};

/** Default Lightbox tile: renders a `GalleryImage` using `image.url` directly. */
const LightboxTile = ({ image, onDelete }: LightboxTileProps) => (
  <GalleryImage image={image} url={image.url} onDelete={onDelete} />
);

LightboxTile.displayName = `${LIGHTBOX_NAME}.Tile`;

//
// Root
//

type LightboxRootProps = PropsWithChildren<{
  gallery: Gallery.Gallery;
  onDelete?: (index: number) => void;
  /** Render a single tile. Defaults to `Lightbox.Tile` (`GalleryImage` with `image.url` as src). */
  Tile?: ComponentType<LightboxTileProps>;
  /** Custom empty-state node. Defaults to a translated message. */
  emptyMessage?: ReactNode;
}>;

/**
 * Headless context provider for a Lightbox masonry. Containers compose
 * `Panel.Root` / `Panel.Toolbar` / `Panel.Content` around `Lightbox.Viewport`.
 */
const LightboxRoot = ({ gallery, onDelete, Tile = LightboxTile, emptyMessage, children }: LightboxRootProps) => (
  <Provider gallery={gallery} onDelete={onDelete} Tile={Tile} emptyMessage={emptyMessage}>
    {children}
  </Provider>
);

LightboxRoot.displayName = `${LIGHTBOX_NAME}.Root`;

//
// Viewport
//

type LightboxViewportProps = ThemedClassName<{}>;

/**
 * Renders the masonry grid (or the empty state) for the gallery in context.
 * Composable: forwards ref + classNames so callers can `<Panel.Content asChild>`
 * over it. Owns the `ScrollArea.Root` (via `Masonry.Content`).
 */
const LightboxViewport = composable<HTMLDivElement, LightboxViewportProps>((props, forwardedRef) => {
  const { t } = useTranslation(meta.id);
  const { gallery, onDelete, Tile, emptyMessage } = useLightboxContext(`${LIGHTBOX_NAME}.Viewport`);
  const images = gallery.images ?? [];
  const items = useMemo(
    () => images.map((image, index) => ({ image, index })),
    // Length tracks ECHO-array mutations even when the underlying reference is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [images, images.length],
  );

  if (items.length === 0) {
    return (
      <div
        {...composableProps(props, { classNames: 'flex items-center justify-center h-full text-subdued' })}
        ref={forwardedRef}
        role='status'
      >
        {emptyMessage ?? t('empty.message')}
      </div>
    );
  }

  return (
    <Masonry.Root
      Tile={({ data }: { data: { image: Gallery.Image; index: number } }) => (
        <Tile image={data.image} index={data.index} onDelete={onDelete && (() => onDelete(data.index))} />
      )}
    >
      <Masonry.Content {...composableProps(props)} ref={forwardedRef} centered>
        <Masonry.Viewport
          items={items}
          getId={(data: { image: Gallery.Image; index: number }) => `${data.index}:${data.image.url}`}
        />
      </Masonry.Content>
    </Masonry.Root>
  );
});

LightboxViewport.displayName = `${LIGHTBOX_NAME}.Viewport`;

//
// Lightbox
//

export const Lightbox = {
  Root: LightboxRoot,
  Tile: LightboxTile,
  Viewport: LightboxViewport,
};

export type { LightboxRootProps, LightboxTileProps, LightboxViewportProps };
