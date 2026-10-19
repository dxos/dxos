//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type Bounds, type Camera, easeInOut, fitBounds, screenBounds, useViewport } from '@dxos/react-ui-canvas';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type Border, BORDER_GROUND, BORDERS, borderLayout } from './border.ts';
import { deckShots } from './deck.ts';
import {
  type Cell,
  type CellMeta,
  type Frame,
  type Reveal,
  REVEALS,
  TILE,
  type Variant,
  VARIANTS,
  shiftShots,
} from './reveal.ts';

/** Clips are read from the gitignored `temp/grid-zoom/clip-NN.mp4` at the repo root; missing ones show a placeholder. */
const CLIPS_DIR = '../../../../../temp/grid-zoom/';

/** Tile tones for numbered cells: the hue surfaces, which re-tone themselves for light and dark. */
const TONES = [
  'bg-sky-surface text-sky-fg',
  'bg-teal-surface text-teal-fg',
  'bg-amber-surface text-amber-fg',
  'bg-rose-surface text-rose-fg',
  'bg-violet-surface text-violet-fg',
  'bg-emerald-surface text-emerald-fg',
  'bg-orange-surface text-orange-fg',
  'bg-indigo-surface text-indigo-fg',
  'bg-lime-surface text-lime-fg',
  'bg-pink-surface text-pink-fg',
  'bg-cyan-surface text-cyan-fg',
  'bg-purple-surface text-purple-fg',
];

/** What fills the cells: every clip, the tour clips with every other cell numbered, or numbers only. */
type Content = 'clips' | 'tours' | 'numbers';

type GridProps = {
  cols: number;
  rows: number;
  /** Scene-unit gap between tiles. */
  gap: number;
  /**
   * Cells (`[col, row]`) the camera visits in turn, each filling the view and playing `tour-<n>.mp4`; a cell outside
   * the grid (a negative column) is added to it. Unset is one cell of row 3 per entry of `holds` (three without it),
   * from the left, so three end in the bottom-left quadrant.
   */
  tour?: [number, number][];
  /** Time held on each toured tile, in ms. */
  hold: number;
  /** Time held on each toured tile in turn, in ms (a clip's length); a tile without an entry holds for `hold`. */
  holds?: number[];
  /** How long before the last toured tile's hold ends the zoom-out starts, in ms, so its clip plays on as it zooms. */
  overlap?: number;
  /** Time to pan from one toured tile to the next, in ms. */
  pan: number;
  /** Final zoom-out time, in ms. */
  duration: number;
  /** Shows the replay button and timing readout; off for a recording, which must carry no overlay. */
  controls?: boolean;
  /**
   * Renders one frame at a time instead of in real time: the clips pause, and `window.grid.seek(ms)` moves the
   * camera and every visible clip to `ms`, so a recorder can screenshot exact frames at any rate.
   */
  stepped?: boolean;
  /** How the grid is revealed after the tour; see `reveal.ts`. */
  variant?: Variant;
  /** What fills the cells. */
  content?: Content;
  /** Shift loop: each tour close-up's slot, landing to landing, in ms (its hold plus one transition). */
  tourSlot?: number;
  /** Shift loop: each montage close-up's slot, in ms. */
  montageSlot?: number;
  /** Shift loop: the montage's close-ups after the tour, as row-major cell indices. */
  montage?: number[];
  /** Shift loop: each zoom (out to 3x3, or back in), in ms. */
  zoomMs?: number;
  /** Shift loop: each row or column slide, in ms. */
  shiftMs?: number;
  /** Shift loop: cells each shift moves, 1 or 2; 0 varies it from cycle to cycle. */
  shiftDistance?: number;
  /** How each cell is framed; see `border.ts`. Unset is the original tile. */
  border?: Border;
  /** Fades the frame out as a cell grows to fill the view, so a close-up shows the clip edge to edge. */
  borderFade?: boolean;
};

declare global {
  interface Window {
    grid?: { total: number; seek: (ms: number) => Promise<void> };
  }
}

/** One leg of the camera's path: held on a tile (`focus`), moving between two cameras, or the final reveal. */
type Shot = {
  ms: number;
  focus?: string;
  move?: (t: number) => Camera;
  camera?: Camera;
  reveal?: Reveal;
  /** The whole frame at the leg's raw progress (0–1). */
  frame?: (t: number) => Frame;
};

/**
 * The shift loop's montage after the tour: meeting (the fourth tour clip), then the 2026-10-18 grid's other clips by
 * cell — explorer, map, chess, spacetime, explorer, chess, meeting, explorer, chess — so map and spacetime show once.
 */
const MONTAGE = [21, 6, 9, 1, 14, 15, 10, 12, 17, 13];

/** `count` cells of row 3 from the left; three end in the bottom-left quadrant of a 6x6 grid. */
const defaultTour = (count = 3): [number, number][] => Array.from({ length: count }, (_, col) => [col, 3]);

/** A straight slide between two cameras at the same zoom, so a pan never zooms out and back in. */
const slide =
  (from: Camera, to: Camera) =>
  (t: number): Camera => ({
    zoom: from.zoom + (to.zoom - from.zoom) * t,
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  });

type TileProps = {
  /** The clip's file name, without extension; unset draws `label` on a tone instead. */
  clip?: string;
  /** Shown when the clip is missing or unset. */
  label: string;
  /** Picks the numbered tile's tone. */
  index: number;
  /** The cell's frame; unset is the original small-radius tile. */
  border?: Border;
  /** How much of the frame shows (0–1). */
  strength?: number;
  /** A plank header strip and crop alignment (the console). */
  meta?: CellMeta;
  bounds: Bounds;
  /** Called with the clip once its length is known, or with nothing if it has no clip. */
  onLoad?: (video?: HTMLVideoElement) => void;
  /** Plays in real time; off when the story is stepped and the clip is seeked frame by frame. */
  playing: boolean;
};

const Tile = ({ clip, label, index, bounds, onLoad, playing, border, strength = 1, meta }: TileProps) => {
  const [failed, setFailed] = useState(false);
  // A numbered tile has nothing to load, so it reports in as soon as it mounts.
  useEffect(() => {
    if (clip === undefined) {
      onLoad?.();
    }
  }, [clip]);
  // A non-literal URL so Vite resolves it at runtime instead of bundling a file that only exists locally.
  const src = useMemo(() => new URL(`${CLIPS_DIR}${clip}.mp4`, import.meta.url).href, [clip]);
  const frame = border && borderLayout(border, bounds.width, index, strength);
  const body = (
    <>
      {clip === undefined ? (
        <div
          className={`grid dx-fill place-items-center font-medium tabular-nums ${TONES[index % TONES.length]}`}
          style={{ fontSize: Math.min(bounds.height * 0.4, bounds.width * 0.3) }}
        >
          {label}
        </div>
      ) : failed ? (
        <div className='grid dx-fill place-items-center text-[120px] text-fg-muted'>{label}</div>
      ) : (
        <video
          className={`dx-fill object-cover ${meta?.align === 'left' ? 'object-left' : meta?.align === 'right' ? 'object-right' : ''}`}
          src={src}
          autoPlay={playing}
          muted
          loop
          playsInline
          preload='auto'
          // Chrome pauses muted autoplay video while it is off-screen and does not reliably resume it.
          onPause={playing ? (event) => void event.currentTarget.play().catch(() => {}) : undefined}
          onLoadedMetadata={(event) => onLoad?.(event.currentTarget)}
          onError={() => {
            setFailed(true);
            onLoad?.();
          }}
        />
      )}
    </>
  );
  const box = { left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height };
  if (meta) {
    const header = meta.header && meta.header.ratio * bounds.height;
    const glyph = header && { width: header * 0.45, height: header * 0.45 };
    return (
      <div className='absolute flex flex-col overflow-hidden bg-base-surface' style={box}>
        {meta.header && header && glyph && (
          <div
            className='flex shrink-0 items-center border-b border-separator text-fg-muted'
            style={{ height: header, gap: header * 0.25, paddingInline: header * 0.3, fontSize: header * 0.36 }}
          >
            <Icon.Icon icon={meta.header.icon} style={glyph} />
            <span className='grow truncate'>
              Space <span className='text-fg-subtle'>/</span> <span className='text-fg'>{meta.header.title}</span>
            </span>
            <Icon.Icon icon='ph--arrows-out--regular' style={glyph} />
            <Icon.Icon icon='ph--x--regular' style={glyph} />
          </div>
        )}
        <div className='relative grow'>{body}</div>
      </div>
    );
  }
  if (!frame) {
    return (
      <div className='absolute overflow-hidden rounded-sm bg-base-surface' style={box}>
        {body}
      </div>
    );
  }
  return (
    <div className={`absolute ${frame.panel.className}`} style={{ ...box, ...frame.panel.style }}>
      <div className='absolute overflow-hidden bg-base-surface' style={{ inset: frame.inset, ...frame.content }}>
        {body}
      </div>
    </div>
  );
};

/**
 * A grid of looping clips under one camera: it opens on the tour's first cell filling the view, holds while its clip
 * plays, slides right to each further cell at the same zoom, then zooms out along `interpolateCamera`'s path until the
 * whole grid (and any tour cell outside it) fits.
 */
const DefaultStory = ({
  cols,
  rows,
  gap,
  tour: tourProp,
  hold,
  holds: holdsProp,
  overlap = 0,
  pan,
  duration,
  controls = true,
  stepped = false,
  variant = 'zoom',
  content = 'clips',
  tourSlot = 10_000,
  montageSlot = 3_000,
  montage: montageProp,
  zoomMs = 600,
  shiftMs = 300,
  shiftDistance = 0,
  border,
  borderFade = false,
}: GridProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const viewport = useViewport(ref);
  const [elapsed, setElapsed] = useState(0);
  const [run, setRun] = useState(0);
  const videos = useRef(new Map<string, HTMLVideoElement>());
  // The tour starts once its first tile has loaded (or turned out to have no clip).
  const [ready, setReady] = useState(false);
  // An empty tour would generate no shots, so no tile renders; it falls back to the default like an unset one.
  const tour = useMemo(
    () => (tourProp?.length ? tourProp : defaultTour(holdsProp?.length || 3)),
    [tourProp, holdsProp],
  );
  // Coerced because array args given in the story URL arrive as strings.
  const holds = useMemo(() => tour.map((_, step) => Number(holdsProp?.[step] ?? hold)), [tour, holdsProp, hold]);

  /** Every cell drawn: the grid's, then any tour cell outside it; a tour cell plays its own clip. */
  const cells = useMemo((): Cell[] => {
    const key = ([col, row]: [number, number]) => `${col},${row}`;
    const steps = new Map(tour.map((cell, step) => [key(cell), step]));
    const grid = Array.from({ length: cols * rows }, (_, index): [number, number] => [
      index % cols,
      Math.floor(index / cols),
    ]);
    const [lastCol, lastRow] = tour[tour.length - 1];
    const extra = `${lastCol + 1},${lastRow}`;
    const outside = tour.filter(([col, row]) => col < 0 || col >= cols || row < 0 || row >= rows);
    return [...grid, ...outside].map((cell) => {
      const [col, row] = cell;
      const step = steps.get(key(cell));
      const number = String(row * cols + col + 1);
      // The variants' cell after the last tour cell plays the next tour clip, so it leads the montage.
      const next =
        content !== 'numbers' &&
        (content === 'tours' || variant === 'shift' || variant === 'console') &&
        tour.length < 4 &&
        key(cell) === extra;
      const clip =
        step !== undefined
          ? content === 'numbers'
            ? undefined
            : `tour-${step + 1}`
          : next
            ? `tour-${tour.length + 1}`
            : content === 'clips'
              ? `clip-${String(row * cols + col).padStart(2, '0')}`
              : undefined;
      return {
        id: key(cell),
        col,
        row,
        clip,
        label: clip === undefined || step === undefined ? number : `Demo ${step + 1}`,
        bounds: { x: col * (TILE.width + gap), y: row * (TILE.height + gap), ...TILE },
      };
    });
  }, [tour, cols, rows, gap, content, variant]);

  const shots = useMemo((): Shot[] => {
    if (viewport.width === 0) {
      return [];
    }
    const all = cells.map((cell) => cell.bounds);
    const x = Math.min(...all.map((bounds) => bounds.x));
    const y = Math.min(...all.map((bounds) => bounds.y));
    const extent = {
      x,
      y,
      width: Math.max(...all.map((bounds) => bounds.x + bounds.width)) - x,
      height: Math.max(...all.map((bounds) => bounds.y + bounds.height)) - y,
    };
    if (variant === 'shift' || variant === 'console') {
      const byId = new Map(cells.map((cell) => [cell.id, cell]));
      const tourCells = tour.flatMap(([col, row]) => byId.get(`${col},${row}`) ?? []);
      const montage = (montageProp?.length ? montageProp : MONTAGE).flatMap(
        (index) => byId.get(`${Number(index) % cols},${Math.floor(Number(index) / cols)}`) ?? [],
      );
      return (variant === 'console' ? deckShots : shiftShots)({
        cells,
        sequence: [...tourCells, ...montage],
        slots: [...tourCells.map(() => Number(tourSlot)), ...montage.map(() => Number(montageSlot))],
        viewport,
        gap,
        cols,
        rows,
        zoom: Number(zoomMs),
        shift: Number(shiftMs),
        distance: Number(shiftDistance),
      });
    }
    const cameras = tour.map(([col, row]) =>
      fitBounds({ x: col * (TILE.width + gap), y: row * (TILE.height + gap), ...TILE }, viewport),
    );
    return tour.flatMap(([col, row], step): Shot[] => {
      const from = cameras[step];
      const last = step === cameras.length - 1;
      const focus = `${col},${row}`;
      const cell = cells.find((cell) => cell.id === focus);
      return [
        { ms: last ? Math.max(0, holds[step] - overlap) : holds[step], focus, camera: from },
        last && cell
          ? {
              ms: duration,
              reveal: REVEALS[variant]({
                from,
                cells,
                focus: cell,
                tour: tour.map(([col, row]) => `${col},${row}`),
                extent,
                viewport,
                gap,
                cols,
                rows,
                duration,
              }),
            }
          : { ms: pan, move: slide(from, cameras[step + 1]) },
      ];
    });
  }, [
    cells,
    tour,
    viewport,
    gap,
    holds,
    overlap,
    pan,
    duration,
    variant,
    cols,
    rows,
    montageProp,
    tourSlot,
    montageSlot,
    zoomMs,
    shiftMs,
    shiftDistance,
  ]);
  const total = shots.reduce((sum, shot) => sum + shot.ms, 0);

  useEffect(() => {
    if (!ready || shots.length === 0 || stepped) {
      return;
    }
    let frame = 0;
    let focused: string | undefined;
    const start = performance.now();
    const tick = (now: number) => {
      const time = Math.min(total, now - start);
      setElapsed(time);
      // Each toured clip restarts as the camera arrives, so its hold shows it from the beginning.
      const focus = shotAt(shots, time).shot.focus;
      if (focus !== undefined && focus !== focused) {
        const video = videos.current.get(focus);
        if (video) {
          video.currentTime = 0;
          void video.play().catch(() => {});
        }
      }
      focused = focus;
      if (time < total) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, ready, shots, total, stepped]);

  useEffect(() => {
    if (!ready || shots.length === 0 || !stepped) {
      return;
    }
    // When each toured clip's hold starts, so a seek can play it from its beginning as the camera arrives.
    const holdStart = new Map<string, number>();
    const zoomStart =
      shots.reduce((start, shot) => {
        if (shot.focus) {
          holdStart.set(shot.focus, start);
        }
        return start + shot.ms;
      }, 0) - shots[shots.length - 1].ms;
    window.grid = {
      total,
      seek: async (ms) => {
        setElapsed(ms);
        const frame = frameAt(shots, ms);
        if (!frame) {
          return;
        }
        await Promise.all(
          cells.map((cell) => {
            const video = videos.current.get(cell.id);
            const box = screenBounds(frame.camera, frame.place?.(cell) ?? cell.bounds);
            const onScreen =
              box.x < viewport.width && box.y < viewport.height && box.x + box.width > 0 && box.y + box.height > 0;
            if (!video || !onScreen || !Number.isFinite(video.duration)) {
              return undefined;
            }
            const start = holdStart.get(cell.id);
            const local = Math.max(0, start === undefined ? ms : ms - start) / 1_000;
            // A toured clip plays once and rests on its last frame as the camera leaves it, looping only once the
            // zoom-out starts, so the slide away never jumps back to its opening.
            const time =
              start !== undefined && ms < zoomStart
                ? Math.min(local, Math.max(0, video.duration - 0.02))
                : local % video.duration;
            if (Math.abs(video.currentTime - time) < 0.001) {
              return undefined;
            }
            // A decode error or an unseekable source never fires `seeked`, so a stalled seek gives up after a second.
            return new Promise<void>((resolve) => {
              const timeout = setTimeout(resolve, 1_000);
              const done = () => {
                clearTimeout(timeout);
                resolve();
              };
              video.addEventListener('seeked', done, { once: true });
              video.addEventListener('error', done, { once: true });
              video.currentTime = time;
            });
          }),
        );
        // Two frames: one for React to commit the camera, one for the compositor to paint it.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      },
    };
    return () => {
      delete window.grid;
    };
  }, [ready, shots, total, stepped, cells, viewport]);

  const frame = frameAt(shots, elapsed);
  const camera = frame?.camera;

  return (
    // The light ground is a mid neutral rather than the near-white group surface, so the gutters read as lines between tiles.
    <div
      ref={ref}
      className={`relative dx-fill overflow-hidden ${(border && BORDER_GROUND[border]) ?? 'bg-neutral-250 dark:bg-group-surface'}`}
    >
      {/* Placed in screen space rather than under one scaled container: Chrome stops painting videos in a layer scaled far down. */}
      {frame?.decor?.map(({ bounds: scene, className, icon, radius }, index) => {
        const bounds = screenBounds(frame.camera, scene);
        const style = {
          left: bounds.x,
          top: bounds.y,
          width: bounds.width,
          height: bounds.height,
          borderRadius: (radius ?? 0) * frame.camera.zoom,
        };
        return icon ? (
          <Icon.Icon key={index} icon={icon} classNames={`absolute ${className}`} style={style} />
        ) : (
          <div key={index} className={`absolute ${className}`} style={style} />
        );
      })}
      {frame &&
        cells.map((cell, index) => {
          const scene = frame.place?.(cell) ?? cell.bounds;
          const region = frame.clip?.(cell);
          const area = region && screenBounds(frame.camera, region);
          const box = screenBounds(frame.camera, scene);
          // A cell clipped to its region is placed inside the region's box, so it slides out of view at its edge.
          const bounds = area ? { ...box, x: box.x - area.x, y: box.y - area.y } : box;
          const tile = (
            <Tile
              key={cell.id}
              clip={cell.clip}
              label={cell.label}
              index={index}
              bounds={bounds}
              border={border}
              meta={frame.meta?.(cell)}
              strength={borderFade ? Math.min(1, Math.max(0, 1.5 * (1 - bounds.width / viewport.width))) : 1}
              playing={!stepped}
              onLoad={(video) => {
                if (video) {
                  videos.current.set(cell.id, video);
                }
                if (cell.id === `${tour[0][0]},${tour[0][1]}`) {
                  setReady(true);
                }
              }}
            />
          );
          return area ? (
            <div
              key={cell.id}
              className='absolute overflow-hidden'
              style={{ left: area.x, top: area.y, width: area.width, height: area.height }}
            >
              {tile}
            </div>
          ) : (
            tile
          );
        })}
      <div className={controls ? 'absolute top-2 left-2 w-fit' : 'hidden'}>
        <Toolbar.Root size='sm' classNames='gap-1 px-2 py-1 rounded-sm bg-modal-surface border border-separator'>
          <Button.Root
            variant='ghost'
            iconOnly
            icon='ph--arrow-counter-clockwise--regular'
            label='Replay'
            onClick={() => setRun((run) => run + 1)}
          />
          <Toolbar.Text classNames='text-fg-muted font-mono text-sm whitespace-nowrap'>
            {(elapsed / 1_000).toFixed(1)}s / {(total / 1_000).toFixed(0)}s ·{' '}
            {camera ? `${camera.zoom.toFixed(2)}×` : '—'}
          </Toolbar.Text>
        </Toolbar.Root>
      </div>
    </div>
  );
};

/** The frame `time` ms into the path, or nothing before the viewport is measured. */
const frameAt = (shots: Shot[], time: number): Frame | undefined => {
  if (shots.length === 0) {
    return undefined;
  }
  const { shot, t } = shotAt(shots, time);
  if (shot.frame) {
    return shot.frame(t);
  }
  if (shot.reveal) {
    return shot.reveal(t * shot.ms);
  }
  const camera = shot.camera ?? shot.move?.(easeInOut(t));
  return camera && { camera };
};

/** The shot playing `time` ms into the path, and how far through it (0–1). */
const shotAt = (shots: Shot[], time: number): { shot: Shot; t: number } => {
  let start = 0;
  for (const shot of shots) {
    if (time < start + shot.ms) {
      return { shot, t: (time - start) / shot.ms };
    }
    start += shot.ms;
  }
  return { shot: shots[shots.length - 1], t: 1 };
};

const meta: Meta<GridProps> = {
  title: 'tools/autocue/Grid',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
  // Typed so the story URL can set them (`holds[0]:43300;overlap:12000`); Storybook drops URL args it has no type for.
  argTypes: {
    holds: { type: { name: 'array', value: { name: 'number' } }, control: 'object' },
    overlap: { type: { name: 'number' }, control: 'number' },
    variant: { type: { name: 'enum', value: [...VARIANTS] }, control: 'select', options: VARIANTS },
    montage: { type: { name: 'array', value: { name: 'number' } }, control: 'object' },
    tourSlot: { type: { name: 'number' }, control: 'number' },
    montageSlot: { type: { name: 'number' }, control: 'number' },
    zoomMs: { type: { name: 'number' }, control: 'number' },
    shiftMs: { type: { name: 'number' }, control: 'number' },
    shiftDistance: { type: { name: 'number' }, control: { type: 'select' }, options: [0, 1, 2] },
    border: { type: { name: 'enum', value: [...BORDERS] }, control: 'select', options: BORDERS },
    borderFade: { type: { name: 'boolean' }, control: 'boolean' },
    content: {
      type: { name: 'enum', value: ['clips', 'tours', 'numbers'] },
      control: 'select',
      options: ['clips', 'tours', 'numbers'],
    },
  },
};

export default meta;

type Story = StoryObj<GridProps>;

export const Default: Story = {
  args: {
    cols: 6,
    rows: 6,
    gap: 32,
    hold: 10_000,
    pan: 1_500,
    duration: 12_000,
    controls: true,
    stepped: false,
  },
};

/**
 * Three tour cells of row 3 (markdown, projects, inbox) with short holds, for comparing reveals; with `tours` content the
 * fourth tour clip (meeting) sits in the next cell and the rest are numbered.
 */
const variantArgs = (variant: Variant, content: Content): GridProps => ({
  cols: 6,
  rows: 6,
  // A thin gap, as in the After Effects reference: cells nearly edge to edge.
  gap: 12,
  tour: [
    [0, 3],
    [1, 3],
    [2, 3],
  ],
  hold: 3_000,
  pan: 1_500,
  duration: 12_000,
  controls: true,
  stepped: false,
  variant,
  content,
});

export const ZoomNumbers: Story = { args: variantArgs('zoom', 'numbers') };
export const ZoomTours: Story = { args: variantArgs('zoom', 'tours') };
export const ColumnsNumbers: Story = { args: variantArgs('columns', 'numbers') };
export const ColumnsTours: Story = { args: variantArgs('columns', 'tours') };
export const StepsNumbers: Story = { args: variantArgs('steps', 'numbers') };
export const StepsTours: Story = { args: variantArgs('steps', 'tours') };
export const MosaicNumbers: Story = { args: variantArgs('mosaic', 'numbers') };
export const MosaicTours: Story = { args: variantArgs('mosaic', 'tours') };

/**
 * The shift loop: markdown, projects and inbox as 10s close-ups, then ten 3s montage close-ups, each reached by a 1.5s
 * zoom out, row or column shift and zoom in (about 60s in all).
 */
const shiftArgs = (content: Content): GridProps => ({
  ...variantArgs('shift', content),
  tourSlot: 10_000,
  montageSlot: 3_000,
  zoomMs: 600,
  shiftMs: 300,
  shiftDistance: 0,
});

export const ShiftNumbers: Story = { args: shiftArgs('numbers') };
export const ShiftTours: Story = { args: shiftArgs('tours') };
export const ShiftClips: Story = { args: shiftArgs('clips') };

/** The console: the shift loop on a wall laid out as one giant Composer window, on the same 60s timeline. */
export const ConsoleNumbers: Story = { args: { ...shiftArgs('numbers'), variant: 'console' } };
export const ConsoleTours: Story = { args: { ...shiftArgs('tours'), variant: 'console' } };
export const ConsoleClips: Story = { args: { ...shiftArgs('clips'), variant: 'console' } };
