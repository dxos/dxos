//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useMemo } from 'react';
import { useResizeDetector } from 'react-resize-detector';

import { useObject } from '@dxos/echo-react';
import { Listbox, type ReorderListController, useReorderItem, useReorderList } from '@dxos/react-ui-list';
import * as Hooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Menu from '@dxos/react-ui/Menu';
import { mx } from '@dxos/ui-theme';

import { type SlideSource } from '#deck';
import { isHiddenSlide } from '#markdown';
import { meta } from '#meta';

import { Slide } from '../Slide/index.ts';

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
  /** Adds a slide from a ghost tile after the last one; without it there is no ghost. */
  onAdd?: () => void;
  /** Deletes a slide (or unlinks an object) from the tile's context menu. */
  onDelete?: (index: number) => void;
  /** Hides or shows a markdown slide from the tile's context menu. */
  onToggleHidden?: (index: number) => void;
};

type Tile = { key: string; index: number; source: SlideSource };

/**
 * Thumbnails of every slide, fully revealed, as a keyboard-navigable grid; the current slide is selected.
 */
export const SlideGrid = ({
  slides,
  index,
  onIndexChange,
  onPresent,
  onMove,
  onAdd,
  onDelete,
  onToggleHidden,
}: SlideGridProps) => {
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
                  onDelete={onDelete}
                  onToggleHidden={onToggleHidden}
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
  onDelete?: (index: number) => void;
  onToggleHidden?: (index: number) => void;
};

const SlideTile = ({ tile, controller, draggable, onPresent, onDelete, onToggleHidden }: SlideTileProps) => {
  const { t } = Hooks.useTranslation(meta.profile.key);
  const { rowRef, handleRef, isDragging } = useReorderItem(controller, tile.key);
  const [text] = useObject(tile.source.kind === 'text' ? tile.source.text : undefined);
  const hidden = isHiddenSlide(tile.source.kind === 'markdown' ? tile.source.content : (text?.content ?? ''));
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

  // Only a slide of the presentation's own text can be hidden; a linked object is unlinked rather than deleted.
  const canHide = !!onToggleHidden && tile.source.kind === 'text';
  const canDelete = !!onDelete && tile.source.kind !== 'pending';
  const linked = tile.source.kind === 'object';
  return (
    <Menu.Root
      onSelect={({ value }) => {
        if (value === 'hide') {
          onToggleHidden?.(tile.index);
        } else if (value === 'delete') {
          onDelete?.(tile.index);
        }
      }}
    >
      <Menu.ContextTrigger asChild>
        <Listbox.Item
          ref={ref}
          id={String(tile.index)}
          data-testid={`presenter.slide-grid.${tile.index}`}
          data-hidden={hidden || undefined}
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
          <Listbox.ItemText tone='muted' classNames='text-sm tabular-nums' />
        </Listbox.Item>
      </Menu.ContextTrigger>
      {(canHide || canDelete) && (
        <Menu.Content>
          {canHide && (
            <Menu.Item
              item={{ value: 'hide', label: t(hidden ? 'show-slide.label' : 'hide-slide.label') }}
              data-testid='presenter.slide-grid.hide'
            />
          )}
          {canDelete && (
            <Menu.Item
              item={{ value: 'delete', label: t(linked ? 'remove-section.label' : 'delete-slide.label') }}
              data-testid='presenter.slide-grid.delete'
            />
          )}
        </Menu.Content>
      )}
    </Menu.Root>
  );
};
