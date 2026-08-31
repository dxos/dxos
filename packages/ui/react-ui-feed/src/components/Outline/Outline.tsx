//
// Copyright 2026 DXOS.org
//

import React, {
  type KeyboardEvent as ReactKeyboardEvent,
  useCallback,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
} from 'react';

import { Popover, type ThemedClassName } from '@dxos/react-ui';
import { mx } from '@dxos/ui-theme';

// Rest tick width (px) and the wave radius (in rows) over which the hover extension falls off. The
// peak is the rail's own width: a tick at full extension spans it.
const REST_WIDTH = 8;
/** 2rem, matching the debug minimap it usually sits opposite. */
const DEFAULT_WIDTH = 32;
const WAVE_SPREAD = 2;

/** Height of one tick, and so the pitch the rail thins its markers to. */
const TICK_SIZE = 8;

const intersects = (range: { from: number; to: number }, visible: { from: number; to: number }): boolean =>
  range.from < visible.to && range.to > visible.from;

/**
 * A single anchor marker within the mapped document.
 * `range` is expressed in the document's own position space (e.g. CodeMirror offsets).
 */
export type OutlineMarker = {
  id: string;
  title: string;
  description?: string;
  range: { from: number; to: number };
};

export type OutlineProps = ThemedClassName<{
  markers: OutlineMarker[];
  /** Currently-visible document range; markers intersecting it render brighter ("active"). */
  visibleRange?: { from: number; to: number };
  /**
   * Height of one tick, in px.
   *
   * Fixed rather than shared out over the rail's height: ticks that stretch to fill make a short
   * document's markers enormous and a long one's hairline, so the same rail reads as a different
   * control depending on what is in it. A fixed pitch means the rail thins to what fits and every
   * tick looks the same. @default 8
   */
  tickSize?: number;
  /** Width of the rail, in px, which is also how far a tick extends at the peak of the wave. @default 32 (2rem) */
  width?: number;
  onSelect?: (marker: OutlineMarker, index: number) => void;
  /**
   * Step one item, in whatever the host counts items in.
   *
   * Not one tick: the rail thins its markers to what fits, so the next tick can be ten items away,
   * and a reader pressing an arrow means "the next one" rather than "the next thing I can see". The
   * host steps it with the same mechanism its toolbar uses, which is why this is a callback rather
   * than something the rail decides.
   */
  onNavigate?: (delta: number) => void;
}>;

/**
 * A vertical rail of horizontal ticks, each representing an anchor marker in a
 * scrollable document. The rows tile the full height, so hovering anywhere in the rail activates
 * the nearest tick: it (and its neighbours, with a distance falloff) extends rightward in a wave.
 * A single popover — anchored to the tick the reader is at — shows the
 * marker's title/description. Markers whose range intersects `visibleRange` render at full
 * opacity; the rest are dimmed.
 */
/** A rendered tick: the marker it points at, and the span of the document it stands for. */
type Row = { marker: OutlineMarker; index: number; span: { from: number; to: number } };

/**
 * Evenly spreads `markers` over at most `capacity` rows, keeping the first and last.
 *
 * Each rendered tick then stands for the span up to the next one, so a thinned rail still covers
 * the whole document — a position between two ticks belongs to the one above it, rather than to
 * nothing.
 */
const thin = (markers: OutlineMarker[], capacity: number): Row[] => {
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

export const Outline = ({
  classNames,
  markers,
  visibleRange,
  tickSize = TICK_SIZE,
  width = DEFAULT_WIDTH,
  onSelect,
  onNavigate,
}: OutlineProps) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const rowsRef = useRef<Array<HTMLButtonElement | null>>([]);
  // Two ways to be *at* a tick, kept apart: the pointer is over one, or the rail has focus and the
  // reader has navigated to one. Conflating them means leaving with the mouse cannot dismiss the
  // card — the keyboard position immediately puts it back.
  const [pointer, setPointer] = useState<number | null>(null);
  const [navigated, setNavigated] = useState<number | null>(null);
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

  const natural = markers.length * tickSize;
  // Below two rows the measurement is a transient (an unlaid-out parent), not a real constraint.
  const bounded = available >= tickSize * 2;
  const rows = useMemo(
    () => thin(markers, bounded ? Math.min(markers.length, Math.floor(available / tickSize)) : markers.length),
    [markers, bounded, available, tickSize],
  );

  // Rest is full opacity when there is no visible range to compare against. Compared against the
  // row's span rather than its marker, so a thinned rail still lights the tick the reader is under.
  const isActive = useCallback(
    (row: Row) => (visibleRange ? intersects(row.span, visibleRange) : true),
    [visibleRange],
  );

  // Not "has focus" — "is being driven by the keyboard". A click focuses a tick too, and gating on
  // focus left the card up after the pointer had gone: the reader clicked, moved away, and the
  // keyboard position they never asked for kept it open.
  const [keyboard, setKeyboard] = useState(false);

  // Whichever the reader is actually using. The pointer is the more direct statement, so it wins by
  // default — but not once the arrows are in play: clicking a tick and then pressing an arrow leaves
  // the pointer resting where it was clicked, and a pointer that always wins pins the card to a tick
  // the reader has already navigated away from. Pointing again takes it back (`onPointerEnter`).
  const shown = keyboard ? (navigated ?? pointer) : (pointer ?? navigated);

  // A backstop while a card is up: the pointer arriving anywhere outside the rail clears it.
  //
  // The tick's own leave is enough for a plain hover, and is not enough after a click — the popover
  // that opens brings focus guards that sit over the page, and the tick never sees the pointer go.
  // Verified with a real pointer: hovering away cleared it, clicking and then hovering away did not.
  // Asking the document is the one question no overlay can intercept.
  useEffect(() => {
    if (pointer == null) {
      return;
    }

    const rail = containerRef.current;
    const owner = rail?.ownerDocument;
    if (!rail || !owner) {
      return;
    }

    const onOver = (event: PointerEvent) => {
      if (!rail.contains(event.target as Node | null)) {
        setPointer(null);
      }
    };

    owner.addEventListener('pointerover', onOver);
    return () => owner.removeEventListener('pointerover', onOver);
  }, [pointer]);

  // Offset of the shown tick, read from the tick itself: the rail centres its ticks, so the position
  // is not `index * tickSize` and asking the element is the only answer that stays right.
  const [anchorOffset, setAnchorOffset] = useState(0);
  useLayoutEffect(() => {
    const row = shown == null ? null : rowsRef.current[shown];
    if (row) {
      setAnchorOffset(row.offsetTop + row.offsetHeight / 2);
    }
  }, [shown]);

  // Wave falloff: a Gaussian (normal-distribution) bell centred on the tick shown — a rounded
  // peak with inflected shoulders that flatten toward rest, rather than a dome. `WAVE_SPREAD` is
  // the standard deviation (in rows).
  const widthFor = useCallback(
    (index: number) => {
      if (shown == null) {
        return REST_WIDTH;
      }

      const distance = index - shown;
      const falloff = Math.exp(-(distance * distance) / (2 * WAVE_SPREAD * WAVE_SPREAD));
      return REST_WIDTH + (width - REST_WIDTH) * falloff;
    },
    [shown, width],
  );

  // Arrow keys walk the rail. The ticks are buttons, so tab reaches the rail and the arrows then
  // move within it — the roving behaviour a vertical list of controls is expected to have. The step
  // while the keyboard is still on a tick; and clamped to `rows`, since thinning can leave the ref
  // array longer than the rail it now renders.
  const handleKeyDown = useCallback(
    (event: ReactKeyboardEvent<HTMLDivElement>) => {
      const delta = event.key === 'ArrowDown' ? 1 : event.key === 'ArrowUp' ? -1 : 0;
      if (!delta) {
        return;
      }

      // Navigation wins where the host offers it: a focused tick is a place in the document, so the
      // arrows move through the document rather than through the rail's own ticks — which are
      // thinned, and so are not one-to-one with anything the reader is counting.
      if (onNavigate) {
        event.preventDefault();
        setKeyboard(true);
        onNavigate(delta);
        return;
      }

      // Otherwise they walk the rail, the roving behaviour a vertical list of controls is expected
      // to have. Taken from the focused element rather than from the shown tick, and clamped to
      // `rows`, since thinning can leave the ref array longer than the rail it now renders.
      const current = rowsRef.current.findIndex((element) => element === event.target);
      if (current < 0) {
        return;
      }

      const next = Math.min(Math.max(current + delta, 0), rows.length - 1);
      event.preventDefault();
      rowsRef.current[next]?.focus();
    },
    [rows.length, onNavigate],
  );

  // While the rail has focus, the shown tick follows where the reader has got to.
  //
  // Navigation steps items and the rail shows ticks, and the two are not one-to-one — so after an
  // arrow press the popover would otherwise describe the tick the pointer last touched rather than
  // the place the reader is now. Derived from the visible range, so it tracks the list however the
  // reader moved: the arrows, the toolbar, or the scrollbar.
  const visibleFrom = visibleRange?.from;
  useEffect(() => {
    if (!keyboard || visibleFrom == null) {
      setNavigated(null);
      return;
    }

    const index = rows.findIndex((row) => visibleFrom < row.span.to);
    setNavigated(index < 0 ? rows.length - 1 : index);
  }, [keyboard, visibleFrom, rows]);

  const hoveredMarker = shown == null ? undefined : rows[shown]?.marker;

  return (
    <Popover.Root open={hoveredMarker != null}>
      <div
        role='navigation'
        className={mx('relative flex flex-col justify-center overflow-hidden', classNames)}
        style={{
          width: `${width}px`,
          height: bounded ? '100%' : `${natural}px`,
        }}
        // Published so a test can ask *why* a card is up — the pointer being over a tick, or the
        // keyboard having navigated to one — rather than only that it is (§12).
        data-pointer={pointer ?? ''}
        data-navigated={navigated ?? ''}
        // And which of the two is actually being shown, since that is the invariant — the reader
        // sees one card, not two states (§12).
        data-shown={shown ?? ''}
        // A pointer anywhere in the rail ends the keyboard's claim on what is shown: the reader has
        // gone back to pointing, and the two should not both assert a position.
        onPointerDown={() => setKeyboard(false)}
        onBlurCapture={(event) => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            setKeyboard(false);
          }
        }}
        onKeyDown={handleKeyDown}
        ref={containerRef}
      >
        {/* Ticks are a fixed height, so a document with fewer markers than the rail can hold does not
            fill it — and they are centred rather than stacked at the top, which reads as the rail
            having been cut short. Centring is the rail's own business; where the *rail* sits is its
            container's. */}
        {rows.map((row, index) => {
          const marker = row.marker;
          const active = isActive(row);
          const tick = (
            <button
              key={marker.id}
              type='button'
              aria-label={marker.title}
              // Full-width row; flexes to fill a bounded rail height (min height keeps it hoverable
              // when the rail is unbounded), so any point in the rail maps to a tick. The focus
              // ring is suppressed because focus already shows as the tick extending and
              // darkening — an outline around an invisible full-width row reads as a stray box.
              // `flex-1` with `min-h-0`: the rows share whatever height the rail has, so N markers
              // spread over the full range rather than stacking at their natural pitch and leaving
              // the rest blank. Thinning above guarantees they never need less than the pitch.
              className='flex items-center w-full shrink-0 cursor-pointer outline-none'
              style={{ height: tickSize }}
              ref={(element) => {
                rowsRef.current[index] = element;
              }}
              onPointerEnter={() => {
                setPointer(index);
                // The reader has gone back to pointing, so the keyboard's claim on what is shown
                // ends here rather than at a blur that a mouse never causes.
                setKeyboard(false);
              }}
              // Cleared on the tick that set it, rather than on the rail. A rail-level leave is
              // synthesised from over/out pairs and was observed not firing at all — the card
              // stayed up after the pointer had gone, in the browser and in a test. Moving between
              // ticks does not flicker: the leave and the next enter land in one batch.
              onPointerLeave={() => setPointer((current) => (current === index ? null : current))}
              onFocus={() => keyboard && setNavigated(index)}
              onClick={() => onSelect?.(marker, row.index)}
            >
              <div
                className={mx(
                  'h-[3px] rounded-full transition-all duration-200 ease-out',
                  shown === index ? 'bg-neutral-800 dark:bg-neutral-200' : 'bg-neutral-400 dark:bg-neutral-600',
                  active ? 'opacity-100' : 'opacity-30',
                )}
                style={{ width: widthFor(index) }}
              />
            </button>
          );

          return tick;
        })}

        {/* A separate anchor, and the ticks are never wrapped.
            Wrapping the shown tick in `Popover.Anchor` changes the element type at that position, so
            React unmounts and remounts that button — and a destroyed element never receives
            `pointerleave`, which is why the card would not dismiss when the pointer left. Verified
            with a real pointer: `data-pointer` stayed on the tick after the pointer had gone.
            A zero-height anchor moved to the shown tick's offset keeps every tick stable; the
            popover is keyed to the marker so it still re-measures when the anchor moves. */}
        <Popover.Anchor asChild>
          <div className='absolute left-0' style={{ top: anchorOffset, width, height: 0 }} />
        </Popover.Anchor>
      </div>
      {hoveredMarker && (
        <Popover.Content
          // Keyed to the tick: the popover measures its anchor when it mounts, and moving the anchor
          // to a different element does not make it measure again — the card stayed put while the
          // pointer walked the rail, drifting further from the tick with every step. Remounting per
          // tick is what makes it re-measure.
          key={hoveredMarker.id}
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
