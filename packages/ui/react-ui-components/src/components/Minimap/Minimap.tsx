//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useRef, useState } from 'react';

import { Popover, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// Rest/peak tick widths (px) and the wave radius (in rows) over which the hover extension falls off.
const REST_WIDTH = 8;
const PEAK_WIDTH = 48;
const WAVE_SPREAD = 2;

const intersects = (range: { from: number; to: number }, visible: { from: number; to: number }): boolean =>
  range.from < visible.to && range.to > visible.from;

/**
 * A single anchor marker within the mapped document.
 * `range` is expressed in the document's own position space (e.g. CodeMirror offsets).
 */
export type MinimapMarker = {
  id: string;
  title: string;
  description?: string;
  range: { from: number; to: number };
};

export type MinimapProps = ThemedClassName<{
  markers: MinimapMarker[];
  /** Currently-visible document range; markers intersecting it render brighter ("active"). */
  visibleRange?: { from: number; to: number };
  onSelect?: (marker: MinimapMarker, index: number) => void;
}>;

/**
 * A fixed-width (4rem) vertical rail of horizontal ticks, each representing an anchor marker in a
 * scrollable document. The rows tile the full height, so hovering anywhere in the rail activates
 * the nearest tick: it (and its neighbours, with a distance falloff) extends rightward in a wave.
 * A single popover — anchored to the rail's right edge and shifted to the hovered row — shows the
 * marker's title/description. Markers whose range intersects `visibleRange` render at full
 * opacity; the rest are dimmed.
 */
export const Minimap = ({ classNames, markers, visibleRange, onSelect }: MinimapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [hovered, setHovered] = useState<number | null>(null);
  // Vertical offset (px, from the rail top) of the hovered row's centre — positions the popover.
  const [anchorOffset, setAnchorOffset] = useState(0);

  // Rest is full opacity when there is no visible range to compare against.
  const isActive = useCallback(
    (marker: MinimapMarker) => (visibleRange ? intersects(marker.range, visibleRange) : true),
    [visibleRange],
  );

  // Wave falloff: a Gaussian (normal-distribution) bell centred on the hovered row — a rounded
  // peak with inflected shoulders that flatten toward rest, rather than a dome. `WAVE_SPREAD` is
  // the standard deviation (in rows).
  const widthFor = useCallback(
    (index: number) => {
      if (hovered == null) {
        return REST_WIDTH;
      }

      const distance = index - hovered;
      const falloff = Math.exp(-(distance * distance) / (2 * WAVE_SPREAD * WAVE_SPREAD));
      return REST_WIDTH + (PEAK_WIDTH - REST_WIDTH) * falloff;
    },
    [hovered],
  );

  const handleEnter = useCallback((index: number, row: HTMLElement) => {
    setHovered(index);
    const container = containerRef.current;
    if (container) {
      const containerRect = container.getBoundingClientRect();
      const rowRect = row.getBoundingClientRect();
      setAnchorOffset(rowRect.top - containerRect.top + rowRect.height / 2);
    }
  }, []);

  const hoveredMarker = hovered == null ? undefined : markers[hovered];

  return (
    <Popover.Root open={hoveredMarker != null}>
      <Popover.Anchor asChild>
        <div
          role='navigation'
          className={mx('flex flex-col', classNames)}
          style={{
            width: `${PEAK_WIDTH}px`,
            height: `${markers.length * 12}px`,
          }}
          onPointerLeave={() => setHovered(null)}
          ref={containerRef}
        >
          {markers.map((marker, index) => {
            const active = isActive(marker);
            return (
              <button
                key={marker.id}
                type='button'
                aria-label={marker.title}
                // Full-width row; flexes to fill a bounded rail height (min height keeps it hoverable
                // when the rail is unbounded), so any point in the rail maps to a tick.
                className='flex items-center w-full flex-1 min-h-[12px] cursor-pointer'
                onPointerEnter={(event) => handleEnter(index, event.currentTarget)}
                onFocus={(event) => handleEnter(index, event.currentTarget)}
                onClick={() => onSelect?.(marker, index)}
              >
                <div
                  className={mx(
                    'h-[3px] rounded-full transition-all duration-200 ease-out',
                    hovered === index ? 'bg-neutral-800 dark:bg-neutral-200' : 'bg-neutral-400 dark:bg-neutral-600',
                    active ? 'opacity-100' : 'opacity-30',
                  )}
                  style={{ width: widthFor(index) }}
                />
              </button>
            );
          })}
        </div>
      </Popover.Anchor>
      {hoveredMarker && (
        <Popover.Content
          side='right'
          align='start'
          alignOffset={anchorOffset}
          // Pin to the rail's right edge; `alignOffset` (not collision flipping) places it at the row.
          avoidCollisions={false}
          onOpenAutoFocus={(event) => event.preventDefault()}
        >
          <Popover.Viewport>
            <div className='px-2 py-1 max-w-[24rem] w-[24rem]'>
              <p className='truncate font-medium'>{hoveredMarker.title}</p>
              {hoveredMarker.description && (
                <p className='mt-1 text-sm text-description line-clamp-3'>{hoveredMarker.description}</p>
              )}
            </div>
          </Popover.Viewport>
          <Popover.Arrow />
        </Popover.Content>
      )}
    </Popover.Root>
  );
};
