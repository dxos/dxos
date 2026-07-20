//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useState } from 'react';

import { Popover, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// Rest/peak tick widths (px) and the wave radius (in rows) over which the hover extension falls off.
const REST_WIDTH = 8;
const PEAK_WIDTH = 44;
const WAVE_SPREAD = 3;

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
 * A vertical rail of horizontal ticks, each representing an anchor marker in a scrollable
 * document. Hovering a tick extends it (and its neighbours, with a distance falloff) rightward
 * in a wave and opens a popover with the marker's title/description. Markers whose range
 * intersects `visibleRange` render at full opacity; the rest are dimmed.
 */
export const Minimap = ({ classNames, markers, visibleRange, onSelect }: MinimapProps) => {
  const [hovered, setHovered] = useState<number | null>(null);

  // Rest is full opacity when there is no visible range to compare against.
  const isActive = useCallback(
    (marker: MinimapMarker) => (visibleRange ? intersects(marker.range, visibleRange) : true),
    [visibleRange],
  );

  // Wave falloff: the hovered row extends fully; neighbours extend proportionally to their distance.
  const widthFor = useCallback(
    (index: number) => {
      if (hovered == null) {
        return REST_WIDTH;
      }
      const falloff = Math.max(0, 1 - Math.abs(index - hovered) / (WAVE_SPREAD + 1));
      return REST_WIDTH + (PEAK_WIDTH - REST_WIDTH) * falloff;
    },
    [hovered],
  );

  return (
    <div
      role='navigation'
      className={mx('flex flex-col items-start justify-center py-2', classNames)}
      onPointerLeave={() => setHovered(null)}
    >
      {markers.map((marker, index) => {
        const active = isActive(marker);
        return (
          <Popover.Root key={marker.id} open={hovered === index}>
            <Popover.Trigger asChild>
              <button
                type='button'
                aria-label={marker.title}
                className='flex items-center shrink-0 py-[3px] cursor-pointer'
                onPointerEnter={() => setHovered(index)}
                onFocus={() => setHovered(index)}
                onClick={() => onSelect?.(marker, index)}
              >
                <div
                  className={mx(
                    'h-[3px] rounded-full transition-all duration-200 ease-out',
                    hovered === index ? 'bg-primary-500' : 'bg-neutral-400 dark:bg-neutral-500',
                    active ? 'opacity-100' : 'opacity-30',
                  )}
                  style={{ width: widthFor(index) }}
                />
              </button>
            </Popover.Trigger>
            <Popover.Content side='right' align='center' onOpenAutoFocus={(event) => event.preventDefault()}>
              <Popover.Viewport>
                <div className='px-2 py-1 max-w-[24rem]'>
                  <p className='truncate font-medium'>{marker.title}</p>
                  {marker.description && (
                    <p className='mt-1 text-sm text-description line-clamp-3'>{marker.description}</p>
                  )}
                </div>
              </Popover.Viewport>
              <Popover.Arrow />
            </Popover.Content>
          </Popover.Root>
        );
      })}
    </div>
  );
};
