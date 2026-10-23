//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { Listbox, type ReorderListController, useReorderItem, useReorderList } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import { mx } from '@dxos/ui-theme';

import { type SlideSource } from '#deck';
import { meta } from '#meta';

import { SlideRenderer } from '../SlideRenderer/index.ts';

/** Narrowest thumbnail before the grid drops a column (px). */
const TILE_MIN_WIDTH = 240;

export type SlideGridProps = {
  slides: SlideSource[];
  /** The current slide, shown selected. */
  index: number;
  onIndexChange: (index: number) => void;
  /** Invoked on double-click to present from that slide. */
  onPresent?: (index: number) => void;
  /** Moves a slide; without it the thumbnails cannot be dragged. */
  onMove?: (from: number, to: number) => void;
};

type Tile = { key: string; index: number; source: SlideSource };

/**
 * Thumbnails of every slide, fully revealed, as a keyboard-navigable grid; the current slide is selected.
 */
export const SlideGrid = ({ slides, index, onIndexChange, onPresent, onMove }: SlideGridProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { ref, width } = useResizeDetector({ refreshMode: 'debounce', refreshRate: 100, handleHeight: false });
  const columns = Math.max(1, Math.floor((width ?? 0) / TILE_MIN_WIDTH));
  // An object linked twice yields two slides with one id, so options are keyed by position.
  const items = useMemo(
    () => slides.map((_, slideIndex) => ({ value: String(slideIndex), label: String(slideIndex + 1) })),
    [slides],
  );
  // Tiles carry their position for the same reason, and their source for the thumbnail.
  const tiles = useMemo(
    () => slides.map((source, slideIndex): Tile => ({ key: `${source.id}:${slideIndex}`, index: slideIndex, source })),
    [slides],
  );
  const handleMove = useCallback(
    (from: number, to: number) => {
      onMove?.(from, to);
      // The moved slide stays the current one.
      onIndexChange(to);
    },
    [onMove, onIndexChange],
  );
  // A wrapped grid reads left to right, so a drop lands before or after a tile by its nearer side.
  const { controller } = useReorderList<Tile>({
    items: tiles,
    getId: (tile) => tile.key,
    onMove: handleMove,
    axis: 'horizontal',
    readonly: !onMove,
    dragPreview: 'clone',
  });
  const select = (value: string | null) => {
    const next = Number(value);
    if (value !== null && Number.isInteger(next)) {
      onIndexChange(next);
    }
  };

  return (
    <div ref={ref} className='flex flex-col dx-grow'>
      {!!width && (
        <Listbox.Root
          items={items}
          tiles={columns}
          value={String(index)}
          onValueChange={select}
          onHighlightChange={select}
          classNames='dx-grow'
        >
          <Listbox.Viewport>
            <Listbox.Content aria-label={t('slide-grid.label')} data-testid='presenter.slide-grid' classNames='p-4'>
              {tiles.map((tile) => (
                <SlideTile
                  key={tile.key}
                  tile={tile}
                  controller={controller}
                  draggable={!!onMove}
                  onPresent={onPresent}
                />
              ))}
            </Listbox.Content>
          </Listbox.Viewport>
        </Listbox.Root>
      )}
    </div>
  );
};

SlideGrid.displayName = 'SlideGrid';

type SlideTileProps = {
  tile: Tile;
  controller: ReorderListController<Tile>;
  draggable: boolean;
  onPresent?: (index: number) => void;
};

const SlideTile = ({ tile, controller, draggable, onPresent }: SlideTileProps) => {
  const { rowRef, handleRef, isDragging } = useReorderItem(controller, tile.key);
  // The whole tile is the drag handle.
  const ref = useCallback(
    (node: HTMLDivElement | null) => {
      if (draggable) {
        rowRef(node);
        handleRef(node);
      }
    },
    [draggable, rowRef, handleRef],
  );

  return (
    <Listbox.Item
      ref={ref}
      id={String(tile.index)}
      data-testid={`presenter.slide-grid.${tile.index}`}
      classNames={mx('text-xs', isDragging && 'opacity-50')}
      onDoubleClick={() => onPresent?.(tile.index)}
    >
      {/* Thumbnails are pictures of the slide; their controls must not take clicks from the grid. */}
      <div className='relative flex aspect-video pointer-events-none rounded-sm overflow-hidden border border-separator'>
        <SlideRenderer source={tile.source} step={Number.POSITIVE_INFINITY} />
      </div>
      <Listbox.ItemText tone='muted' classNames='text-sm tabular-nums' />
    </Listbox.Item>
  );
};
