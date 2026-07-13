//
// Copyright 2026 DXOS.org
//

import React, { type MouseEvent, type ReactNode, useMemo } from 'react';

import { type Obj, type Ref } from '@dxos/echo';
import { Icon, useTranslation } from '@dxos/react-ui';
import { Masonry } from '@dxos/react-ui-masonry';

import { meta } from '#meta';

import { useVariantSource } from '../../hooks';
import { GalleryImage } from '../GalleryImage';

/** The subset of a {@link Variant} a gallery tile needs (a live object or a snapshot). */
export type VariantTileSource = {
  id?: string;
  url?: string;
  content?: Ref.Ref<Obj.Unknown>;
  contentType?: string;
  label?: string;
};

export type VariantGalleryProps = {
  variants: ReadonlyArray<VariantTileSource>;
  emptyMessage?: ReactNode;
  /** Ids of selected tiles (keyed by {@link VariantTileSource.id}). Enables the selection outline. */
  selectedIds?: ReadonlySet<string>;
  /** Emitted when a tile is clicked; the container toggles its selection state. */
  onSelect?: (id: string, event: MouseEvent) => void;
};

/** Stable per-tile id: the backing object id, else the url / content DXN, else the index. */
const tileId = (variant: VariantTileSource, index: number): string =>
  variant.id ?? variant.url ?? variant.content?.uri ?? String(index);

type TileData = {
  variant: VariantTileSource;
  index: number;
};

const Tile = ({ data, selected }: { data?: TileData; selected?: boolean }) => {
  // Resolve the source (url or materialized content blob); hook is called unconditionally.
  const src = useVariantSource(data?.variant);
  if (!data) {
    return null;
  }
  return (
    <div className='relative'>
      <GalleryImage src={src} alt={data.variant.label} />
      {selected && <Icon icon='ph--check-circle--fill' size={6} classNames='absolute top-1 right-1 text-primary-500' />}
    </div>
  );
};

/**
 * A masonry gallery of an artifact's {@link Variant}s (rendered as thumbnails). Presentation-only —
 * each tile resolves its own source via {@link useVariantSource}; selection state is owned by the
 * container (see `useListSelection`).
 */
export const VariantGallery = ({ variants, emptyMessage, selectedIds, onSelect }: VariantGalleryProps) => {
  const { t } = useTranslation(meta.profile.key);
  const items = useMemo(() => variants.map((variant, index) => ({ variant, index })), [variants]);

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
          getId={(data?: TileData) => (data ? tileId(data.variant, data.index) : '')}
          selectedIds={selectedIds}
          onSelect={onSelect}
        />
      </Masonry.Content>
    </Masonry.Root>
  );
};

VariantGallery.displayName = 'VariantGallery';
