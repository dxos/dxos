//
// Copyright 2025 DXOS.org
//

import { createContext } from '@radix-ui/react-context';
import React, { type ComponentType, type PropsWithChildren, type ReactNode, useEffect, useMemo } from 'react';

import { type Ref } from '@dxos/echo';
import { log } from '@dxos/log';
import { type ThemedClassName, useTranslation } from '@dxos/react-ui';
import { composable, composableProps } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';
import { File } from '@dxos/types';

import { meta } from '#meta';

import { GalleryImage } from '../GalleryImage';

const LIGHTBOX_NAME = 'Lightbox';

/**
 * Structural subset of `Gallery.Gallery` that `Lightbox` actually reads.
 * Accepting this (rather than the schema type) lets containers pass either
 * a plain object (storybook) or a `Snapshot<Gallery>` from `useObject`
 * without an unsafe cast.
 */
type GalleryLike = { images?: ReadonlyArray<Ref.Ref<File.File>> };

type ContextValue = {
  gallery: GalleryLike | undefined;
  onDelete?: (index: number) => void;
  Tile: ComponentType<LightboxTileProps>;
  emptyMessage?: ReactNode;
};

const [Provider, useLightboxContext] = createContext<ContextValue>(LIGHTBOX_NAME);

//
// Tile
//

type LightboxTileProps = {
  file: File.File | undefined;
  index: number;
  onDelete?: () => void;
};

/** Default Lightbox tile: renders a `GalleryImage` from the loaded `File.File`. */
const LightboxTile = ({ file, onDelete }: LightboxTileProps) => <GalleryImage file={file} onDelete={onDelete} />;

LightboxTile.displayName = `${LIGHTBOX_NAME}.Tile`;

//
// Root
//

type LightboxRootProps = PropsWithChildren<{
  gallery: GalleryLike | undefined;
  onDelete?: (index: number) => void;
  /** Render a single tile. Defaults to `Lightbox.Tile` (`GalleryImage` from the loaded `File.File`). */
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
  const { t } = useTranslation(meta.profile.key);
  const { gallery, onDelete, Tile, emptyMessage } = useLightboxContext(`${LIGHTBOX_NAME}.Viewport`);
  const refs = gallery?.images ?? [];

  // Kick off loads for unresolved refs so `ref.target` populates reactively.
  useEffect(() => {
    for (const ref of refs) {
      if (!ref.target) {
        void ref.load().catch((err) => log.catch(err));
      }
    }
    // Length tracks ECHO-array mutations even when the underlying reference is stable.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [refs, refs.length]);

  const items = useMemo(
    () => refs.map((ref, index) => ({ ref, index })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [refs, refs.length],
  );

  const MasonryTile = useMemo(
    () =>
      ({ data }: { data?: { ref: Ref.Ref<File.File>; index: number } }) => {
        if (!data) {
          return null;
        }
        return <Tile file={data.ref.target} index={data.index} onDelete={onDelete && (() => onDelete(data.index))} />;
      },
    [Tile, onDelete],
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
    <Masonry.Root Tile={MasonryTile}>
      <Masonry.Content {...composableProps(props)} ref={forwardedRef} centered>
        <Masonry.Viewport
          items={items}
          // Use the ref DXN as the stable per-tile key — index-based keys would
          // shift after a deletion and force unrelated tiles to remount.
          getId={(data?: { ref: Ref.Ref<File.File>; index: number }) => data?.ref.uri ?? String(data?.index ?? '')}
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
