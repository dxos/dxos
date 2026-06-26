//
// Copyright 2026 DXOS.org
//

import React from 'react';

import { ResizeHandle } from '@dxos/react-ui-dnd';

import { useMosaicContainerContext } from './Container';
import { useMosaicTileContext } from './Tile';

const MOSAIC_RESIZE_HANDLE_NAME = 'Mosaic.ResizeHandle';

// Lower bounds for a tile's extent (rem); below these the content stops being usable.
const MIN_WIDTH = 20;
const MIN_HEIGHT = 3;
// Extent assumed when the subject hasn't been measured yet (matches the deck plank default).
const DEFAULT_EXTRINSIC_SIZE = 50;

export type MosaicResizeHandleProps = {
  /** Lower bound in rem; overrides the tile's `minSize`, else a sensible per-axis minimum. */
  minSize?: number;
  /** Upper bound in rem; overrides the tile's `maxSize`. */
  maxSize?: number;
  /** Extent assumed before the subject is first measured. */
  fallbackSize?: number;
};

/**
 * Edge affordance that resizes the enclosing {@link MosaicTile}. The axis tracks the container
 * orientation (width when horizontal, height when vertical); the tile must be given a `size` so the
 * dragged extent is reflected and persisted via its `onSizeChange`. Resize bounds default to the
 * tile's `minSize`/`maxSize` and can be overridden per handle.
 */
export const MosaicResizeHandle = ({
  minSize,
  maxSize,
  fallbackSize = DEFAULT_EXTRINSIC_SIZE,
}: MosaicResizeHandleProps) => {
  const { orientation = 'vertical' } = useMosaicContainerContext(MOSAIC_RESIZE_HANDLE_NAME);
  const { size, setSize, minSize: tileMinSize, maxSize: tileMaxSize } = useMosaicTileContext(MOSAIC_RESIZE_HANDLE_NAME);
  const horizontal = orientation === 'horizontal';

  return (
    <ResizeHandle
      side={horizontal ? 'inline-end' : 'block-end'}
      fallbackSize={fallbackSize}
      minSize={minSize ?? tileMinSize ?? (horizontal ? MIN_WIDTH : MIN_HEIGHT)}
      maxSize={maxSize ?? tileMaxSize}
      size={size}
      onSizeChange={setSize}
    />
  );
};

MosaicResizeHandle.displayName = MOSAIC_RESIZE_HANDLE_NAME;
