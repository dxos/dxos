//
// Copyright 2026 DXOS.org
//

import React, {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Popover, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// Rest/peak tick widths (px) and the wave radius (in rows) over which the hover extension falls off.
const REST_WIDTH = 8;
const PEAK_WIDTH = 32;
const WAVE_SPREAD = 2;

/** Row pitch: the closest two ticks may sit before the rail starts thinning them. */
const MIN_ROW = 12;

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
/** A rendered tick: the marker it points at, and the span of the document it stands for. */
type Row = { marker: MinimapMarker; index: number; span: { from: number; to: number } };

/**
 * Evenly spreads `markers` over at most `capacity` rows, keeping the first and last.
 *
 * Each rendered tick then stands for the span up to the next one, so a thinned rail still covers
 * the whole document — a position between two ticks belongs to the one above it, rather than to
 * nothing.
 */
const thin = (markers: MinimapMarker[], capacity: number): Row[] => {
  const step = capacity > 1 ? (markers.length - 1) / (capacity - 1) : 0;
  const indexes =
    markers.length <= capacity
      ? markers.map((_, index) => index)
      : Array.from({ length: capacity }, (_, row) => Math.round(row * step));

  return indexes.map((index, row) => ({
    marker: markers[index],
    index,
    span: { from: markers[index].range.from, to: markers[indexes[row + 1]]?.range.from ?? markers[index].range.to },
  }));
};

export const Minimap = ({ classNames, markers, visibleRange, onSelect }: MinimapProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<Array<HTMLButtonElement | null>>([]);
  const [hovered, setHovered] = useState<number | null>(null);
  // Offset (px, from the rail top) of the hovered row's centre. A zero-height anchor is placed
  // there and the popover centres on it, which is the only way to centre on a row without knowing
  // the popover's height: `alignOffset` is ignored for centre alignment, so offsetting the rail
  // itself lands the popover on the rail's middle whatever row is hovered.
  const [anchorOffset, setAnchorOffset] = useState(0);

  // The rail is bounded by whatever contains it. Measured rather than assumed, because the same
  // component is used both in a sized grid cell and floating over a document, where nothing
  // constrains it and its natural height is the right one.
  const [available, setAvailable] = useState(0);
  useEffect(() => {
    const parent = containerRef.current?.parentElement;
    if (!parent) {
      return;
    }

    const observer = new ResizeObserver(([entry]) => setAvailable(entry.contentRect.height));
    observer.observe(parent);
    setAvailable(parent.getBoundingClientRect().height);
    return () => observer.disconnect();
  }, []);

  const natural = markers.length * MIN_ROW;
  // Below two rows the measurement is a transient (an unlaid-out parent), not a real constraint.
  const bounded = available >= MIN_ROW * 2 && natural > available;
  const rows = useMemo(
    () => thin(markers, bounded ? Math.floor(available / MIN_ROW) : markers.length),
    [markers, bounded, available],
  );

  // Rest is full opacity when there is no visible range to compare against. Compared against the
  // row's span rather than its marker, so a thinned rail still lights the tick the reader is under.
  const isActive = useCallback(
    (row: Row) => (visibleRange ? intersects(row.span, visibleRange) : true),
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

  // Arrow keys walk the rail. The ticks are buttons, so tab reaches the rail and the arrows then
  // move within it — the roving behaviour a vertical list of controls is expected to have.
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      if (!delta || hovered == null) {
        return;
      }

      const next = Math.min(Math.max(hovered + delta, 0), rowsRef.current.length - 1);
      event.preventDefault();
      rowsRef.current[next]?.focus();
    },
    [hovered],
  );

  const hoveredMarker = hovered == null ? undefined : rows[hovered]?.marker;

  return (
    <Popover.Root open={hoveredMarker != null}>
      <div
        role='navigation'
        className={mx('relative flex flex-col overflow-hidden', classNames)}
        style={{
          width: `${PEAK_WIDTH}px`,
          height: bounded ? '100%' : `${natural}px`,
        }}
        onPointerLeave={() => setHovered(null)}
        onKeyDown={handleKeyDown}
        ref={containerRef}
      >
        {rows.map((row, index) => {
          const marker = row.marker;
          const active = isActive(row);
          return (
            <button
              key={marker.id}
              type='button'
              aria-label={marker.title}
              // Full-width row; flexes to fill a bounded rail height (min height keeps it hoverable
              // when the rail is unbounded), so any point in the rail maps to a tick. The focus
              // ring is suppressed because focus already shows as the tick extending and
              // darkening — an outline around an invisible full-width row reads as a stray box.
              className='flex items-center w-full flex-1 min-h-[12px] cursor-pointer outline-none'
              ref={(element) => {
                rowsRef.current[index] = element;
              }}
              onPointerEnter={(event) => handleEnter(index, event.currentTarget)}
              onFocus={(event) => handleEnter(index, event.currentTarget)}
              onClick={() => onSelect?.(marker, row.index)}
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

        {/* Zero-height anchor at the hovered row's centre: the popover centres on a point, so it
            needs no knowledge of its own height to line up with the tick. */}
        <Popover.Anchor asChild>
          <div className='absolute left-0' style={{ top: anchorOffset, width: PEAK_WIDTH, height: 0 }} />
        </Popover.Anchor>
      </div>
      {hoveredMarker && (
        <Popover.Content
          side='right'
          align='center'
          // Pinned to the anchor point rather than flipped into view, so it tracks the tick.
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
