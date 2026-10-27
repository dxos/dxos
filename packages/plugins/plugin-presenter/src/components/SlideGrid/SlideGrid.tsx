//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';

import * as AppNode from '@dxos/app-toolkit/AppNode';
import { useObject } from '@dxos/echo-react';
import { Listbox, type ReorderListController, useReorderItem, useReorderList } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import { mx } from '@dxos/ui-theme';

import { type SlideSource } from '#deck';
import { useSlideLabel } from '#hooks';
import { meta } from '#meta';
import { type SlideViewState } from '#types';

import { Slide } from '../Slide/index.ts';

/** Thumbnail width bounds at each grid size (px): the grid drops a column below `min` and stops growing at `max`. */
const TILE_WIDTH: Record<SlideViewState.GridSize, { min: number; max: number }> = {
  small: { min: 200, max: 300 },
  large: { min: 360, max: 540 },
};

export type SlideGridProps = {
  slides: SlideSource[];
  /** The current slide, shown selected. */
  index: number;
  /** Thumbnail size (default `small`). */
  size?: SlideViewState.GridSize;
  onIndexChange: (index: number) => void;
  /** Invoked on double-click to present from that slide. */
  onPresent?: (index: number) => void;
  /** Moves a slide; without it the thumbnails cannot be dragged. */
  onMove?: (from: number, to: number) => void;
  /** Adds a slide from a ghost tile after the last one; without it there is no ghost. */
  onAdd?: () => void;
  /** The graph node a tile shows, so right-clicking it opens that node's actions (the app's context menu). */
  contextMenuId?: (source: SlideSource) => string | undefined;
};

type Tile = { key: string; index: number; source: SlideSource };

/**
 * Thumbnails of every slide, fully revealed, as a keyboard-navigable grid; the current slide is selected.
 */
export const SlideGrid = ({
  slides,
  index,
  size = 'small',
  onIndexChange,
  onPresent,
  onMove,
  onAdd,
  contextMenuId,
}: SlideGridProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
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

  // The listbox reflows tiles of this width as the article resizes, so they never stretch then snap back.
  return (
    <Listbox.Root
      items={items}
      tileWidth={TILE_WIDTH[size]}
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
              contextMenuId={contextMenuId?.(tile.source)}
            />
          ))}
          {onAdd && (
            <div className='flex flex-col p-1 gap-1'>
              <button
                type='button'
                data-testid='presenter.slide-grid.add'
                aria-label={t('add-slide.label')}
                className='flex aspect-video items-center justify-center rounded-sm border border-dashed border-separator text-description hover:bg-hover-surface'
                onClick={onAdd}
              >
                <Icon.Icon icon='ph--plus--regular' size='md' />
              </button>
            </div>
          )}
        </Listbox.Content>
      </Listbox.Viewport>
    </Listbox.Root>
  );
};

SlideGrid.displayName = 'SlideGrid';

type SlideTileProps = {
  tile: Tile;
  controller: ReorderListController<Tile>;
  draggable: boolean;
  onPresent?: (index: number) => void;
  contextMenuId?: string;
};

const SlideTile = ({ tile, controller, draggable, onPresent, contextMenuId }: SlideTileProps) => {
  const { rowRef, handleRef, isDragging } = useReorderItem(controller, tile.key);
  const [slide] = useObject(tile.source.kind === 'markdown' ? undefined : tile.source.slide);
  const hidden = slide?.hidden === true;
  const label = useSlideLabel(tile.source);
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
      data-hidden={hidden || undefined}
      {...(contextMenuId ? AppNode.contextMenuProps(contextMenuId) : {})}
      classNames={mx('text-xs', (isDragging || hidden) && 'opacity-50')}
      onDoubleClick={() => onPresent?.(tile.index)}
    >
      {/* Thumbnails are pictures of the slide; their controls must not take clicks from the grid. */}
      <div className='relative flex aspect-video pointer-events-none rounded-sm overflow-hidden border border-separator'>
        <Slide.Root source={tile.source} step={Number.POSITIVE_INFINITY}>
          <Slide.Frame>
            <Slide.Content />
          </Slide.Frame>
        </Slide.Root>
        {hidden && <Icon.Icon icon='ph--eye-slash--regular' size='md' classNames='absolute top-1 end-1' />}
      </div>
      <Listbox.ItemText tone='muted' classNames='text-sm'>
        <span className='tabular-nums'>{tile.index + 1}</span>
        {label && <span className='ms-2'>{label}</span>}
      </Listbox.ItemText>
    </Listbox.Item>
  );
};
