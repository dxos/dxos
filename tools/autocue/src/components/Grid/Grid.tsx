//
// Copyright 2026 DXOS.org
//

import React, { useEffect, useMemo, useRef, useState } from 'react';

import { type Bounds, type Camera, easeInOut, fitBounds, screenBounds, useViewport } from '@dxos/react-ui-canvas';
import * as Button from '@dxos/react-ui/Button';
import * as Icon from '@dxos/react-ui/Icon';
import * as Input from '@dxos/react-ui/Input';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { type Border, BORDER_GROUND, borderLayout } from './border.ts';
import { spreadClips } from './clips.ts';
import { deckShots } from './deck.ts';
import {
  type Cell,
  type CellMeta,
  type Frame,
  type Reveal,
  REVEALS,
  TILE,
  type Variant,
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
export type Content = 'clips' | 'tours' | 'numbers';

export type GridProps = {
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
  /**
   * Shift loop: each tour close-up's own slot in turn, in ms, so each holds for its clip's full length; it overrides
   * `tourSlot`, which still applies to a tour cell without an entry.
   */
  tourSlots?: number[];
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
  /** Shift loop: stays on the zoomed-out 3x3, so the shifts can be watched without the zooms. */
  overview?: boolean;
  /** Shift loop: zoomed out, the columns drift down continuously at about this many cells per second instead of stepping. */
  drift?: number;
  /** Shift loop: after the last close-up, zooms out and drifts (at `drift`, or 0.2 cells per second) for this many ms. */
  driftAfter?: number;
  /** Called once when the timeline plays to its end in real time. */
  onEnded?: () => void;
  /** How each cell is framed; see `border.ts`. Unset is the original tile. */
  border?: Border;
  /** Fades the frame out as a cell grows to fill the view, so a close-up shows the clip edge to edge. */
  borderFade?: boolean;
  /** Where the clips are read from, relative to this module; unset is the showcase's `temp/grid-zoom/`. */
  clipsDir?: string;
  /** Time held on the whole grid after the zoom-out, in ms, with every clip playing on. */
  tail?: number;
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
  /** Every clip plays during this leg, though there is no close-up (a drift). */
  live?: boolean;
  /** A drift's columns of cell ids, top to bottom. */
  columns?: string[][];
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
  /** The folder `clip` is read from. */
  clipsDir: string;
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

const Tile = ({ clip, clipsDir, label, index, bounds, onLoad, playing, border, strength = 1, meta }: TileProps) => {
  const [failed, setFailed] = useState(false);
  const video = useRef<HTMLVideoElement>(null);
  // `autoPlay` only applies on mount, so pausing the story pauses the clip directly.
  useEffect(() => {
    if (playing) {
      void video.current?.play().catch(() => {});
    } else {
      video.current?.pause();
    }
  }, [playing]);
  // A numbered tile has nothing to load, so it reports in as soon as it mounts.
  useEffect(() => {
    if (clip === undefined) {
      onLoad?.();
    }
  }, [clip]);
  // A non-literal URL so Vite resolves it at runtime instead of bundling a file that only exists locally.
  const src = useMemo(() => new URL(`${clipsDir}${clip}.mp4`, import.meta.url).href, [clipsDir, clip]);
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
          ref={video}
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
export const Grid = ({
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
  tourSlots,
  montageSlot = 3_000,
  montage: montageProp,
  zoomMs = 600,
  shiftMs = 600,
  shiftDistance = 0,
  overview = false,
  drift = 0,
  driftAfter = 0,
  onEnded,
  border,
  borderFade = false,
  clipsDir = CLIPS_DIR,
  tail = 0,
}: GridProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const viewport = useViewport(ref);
  const [elapsed, setElapsed] = useState(0);
  const [run, setRun] = useState(0);
  const [autoplay, setAutoplay] = useState(true);
  // Where the real-time clock starts, so pausing, resuming and stepping pick up from that point.
  const [offset, setOffset] = useState(0);
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
      const montage = (montageProp ?? MONTAGE).flatMap(
        (index) => byId.get(`${Number(index) % cols},${Math.floor(Number(index) / cols)}`) ?? [],
      );
      const options = {
        cells,
        sequence: [...tourCells, ...montage],
        slots: [
          ...tourCells.map((_, step) => Number(tourSlots?.[step] ?? tourSlot)),
          ...montage.map(() => Number(montageSlot)),
        ],
        viewport,
        gap,
        cols,
        rows,
        zoom: Number(zoomMs),
        shift: Number(shiftMs),
        distance: Number(shiftDistance),
      };
      return variant === 'console'
        ? deckShots(options)
        : shiftShots({
            ...options,
            overview: Boolean(overview),
            drift: Number(drift),
            driftAfter: Number(driftAfter),
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
      if (!last || !cell) {
        return [
          { ms: holds[step], focus, camera: from },
          { ms: pan, move: slide(from, cameras[step + 1]) },
        ];
      }
      const reveal = REVEALS[variant]({
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
      });
      return [
        { ms: Math.max(0, holds[step] - overlap), focus, camera: from },
        { ms: duration, reveal },
        ...(Number(tail) > 0 ? [{ ms: Number(tail), reveal: () => reveal(duration) }] : []),
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
    overview,
    drift,
    driftAfter,
    tail,
  ]);
  const total = shots.reduce((sum, shot) => sum + shot.ms, 0);

  // The recording each clip file copies, written by `layout.mjs`; without it every file counts as its own recording.
  const [recordings, setRecordings] = useState<Record<string, string>>();
  useEffect(() => {
    void fetch(new URL(`${clipsDir}layout.json`, import.meta.url).href)
      .then((response) => (response.ok ? response.json() : undefined))
      .then(setRecordings)
      .catch(() => {});
  }, [clipsDir]);
  /** A drift's clips, re-dealt so no recording repeats in a column; otherwise each cell's own. */
  const clipOf = useMemo(() => {
    const columns = shots.find((shot) => shot.columns)?.columns;
    const own = new Map(cells.map((cell) => [cell.id, cell.clip]));
    return columns && recordings ? spreadClips(own, columns, recordings) : own;
  }, [shots, cells, recordings]);
  /** Each close-up's hold: the toolbar steps between them by playing the transition that joins them. */
  const closeUps = useMemo(
    () =>
      shots.reduce<{ start: number; spans: { start: number; end: number; focus: string }[] }>(
        ({ start, spans }, shot) => ({
          start: start + shot.ms,
          spans: shot.focus ? [...spans, { start, end: start + shot.ms, focus: shot.focus }] : spans,
        }),
        { start: 0, spans: [] },
      ).spans,
    [shots],
  );
  const landings = useMemo(() => closeUps.map((hold) => hold.start), [closeUps]);
  // In the shift loops only the close-up plays: grid cells rest on their first frame, so a clip starts without a jump
  // as the camera lands on it, and a clip the camera leaves rests where it stopped. A drift has no close-ups, so all play.
  const stills = (variant === 'shift' || variant === 'console') && !(Number(drift) && !Number(driftAfter));
  const playingCell = closeUps.find((hold) => hold.start <= elapsed && elapsed < hold.end)?.focus;
  const live = shots.length > 0 && shotAt(shots, elapsed).shot.live === true;
  const elapsedRef = useRef(0);
  elapsedRef.current = elapsed;
  const ended = useRef(onEnded);
  ended.current = onEnded;
  /** A still cell's clip time at `ms`: 0 before its first hold, through the hold as it plays, then where it stopped. */
  const stillTime = (id: string, ms: number) =>
    closeUps
      .filter((hold) => hold.focus === id && hold.start <= ms)
      .reduce((_, hold) => Math.min(ms, hold.end) - hold.start, 0);
  // A step plays the timeline from `from` to `to` at real speed (backwards when `to` is earlier), then rests on `land`.
  const [step, setStep] = useState<{ from: number; to: number; land: number }>();
  const current = closeUps.findLastIndex((hold) => hold.start <= elapsed);
  const following = closeUps[current + 1];
  const forward = following
    ? { from: Math.max(elapsed, closeUps[current]?.end ?? 0), to: following.start, land: following.start }
    : undefined;
  // Back from inside a transition reverses it into the close-up it left; from a hold, into the close-up before.
  const backward =
    current >= 0 && elapsed >= closeUps[current].end
      ? { from: elapsed, to: closeUps[current].end, land: closeUps[current].start }
      : current > 0
        ? { from: closeUps[current].start, to: closeUps[current - 1].end, land: closeUps[current - 1].start }
        : undefined;
  const seekTo = (time: number) => {
    setOffset(time);
    setElapsed(time);
  };

  useEffect(() => {
    if (!step) {
      return;
    }
    let frame = 0;
    const begin = performance.now();
    const span = Math.abs(step.to - step.from);
    const tick = (now: number) => {
      const t = span === 0 ? 1 : Math.min(1, (now - begin) / span);
      setElapsed(step.from + (step.to - step.from) * t);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      } else {
        seekTo(step.land);
        setStep(undefined);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [step]);

  useEffect(() => {
    if (!ready || shots.length === 0 || stepped || !autoplay || step) {
      return;
    }
    let frame = 0;
    // Resumes where the clock is, so a re-run caused by a resize (new shots) does not jump back to `offset`.
    const resume = Math.max(offset, elapsedRef.current);
    // Resuming mid-hold keeps the close-up's clip where it paused; starting at a landing plays it from its opening.
    let focused = landings.includes(resume) ? undefined : shotAt(shots, resume).shot.focus;
    const start = performance.now() - resume;
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
      } else {
        ended.current?.();
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, ready, shots, total, stepped, autoplay, offset, landings, step]);

  // A paused step lands its close-up's clip at its opening frame, as playing into it would.
  useEffect(() => {
    // Pausing mid-hold leaves the clip where it is; only a step onto a landing rewinds it.
    if (autoplay || stepped || !landings.includes(offset)) {
      return;
    }
    const focus = shotAt(shots, offset).shot.focus;
    const video = focus === undefined ? undefined : videos.current.get(focus);
    if (video) {
      video.currentTime = 0;
    }
  }, [offset, autoplay, stepped, shots, landings]);

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
    let liveStart: number | undefined;
    shots.reduce((start, shot) => {
      if (shot.live && liveStart === undefined) {
        liveStart = start;
      }
      return start + shot.ms;
    }, 0);
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
            if (stills) {
              // From a drift's start every clip plays on from where it rested, as it does in real time.
              const still =
                liveStart !== undefined && ms >= liveStart
                  ? stillTime(cell.id, liveStart) + (ms - liveStart)
                  : stillTime(cell.id, ms);
              return seekVideo(video, (still / 1_000) % video.duration);
            }
            const start = holdStart.get(cell.id);
            const local = Math.max(0, start === undefined ? ms : ms - start) / 1_000;
            // A toured clip plays once and rests on its last frame as the camera leaves it, looping only once the
            // zoom-out starts, so the slide away never jumps back to its opening.
            const time =
              start !== undefined && ms < zoomStart
                ? Math.min(local, Math.max(0, video.duration - 0.02))
                : local % video.duration;
            return seekVideo(video, time);
          }),
        );
        // Two frames: one for React to commit the camera, one for the compositor to paint it.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      },
    };
    return () => {
      delete window.grid;
    };
  }, [ready, shots, total, stepped, cells, viewport, stills, closeUps]);

  const frame = frameAt(shots, elapsed);
  const camera = frame?.camera;

  return (
    // The stage keeps the video's 16:9 frame, letterboxed in any pane, so the preview frames what the render will.
    <div className='grid dx-fill place-items-center overflow-hidden bg-black' style={{ containerType: 'size' }}>
      {/* The light ground is a mid neutral rather than the near-white group surface, so the gutters read as lines between tiles. */}
      <div
        ref={ref}
        className={`relative overflow-hidden ${(border && BORDER_GROUND[border]) ?? 'bg-neutral-250 dark:bg-group-surface'}`}
        style={{
          width: `min(100cqw, 100cqh * ${TILE.width / TILE.height})`,
          aspectRatio: `${TILE.width} / ${TILE.height}`,
        }}
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
                clip={clipOf.get(cell.id)}
                clipsDir={clipsDir}
                label={cell.label}
                index={index}
                bounds={bounds}
                border={border}
                meta={frame.meta?.(cell)}
                strength={borderFade ? Math.min(1, Math.max(0, 1.5 * (1 - bounds.width / viewport.width))) : 1}
                playing={!stepped && autoplay && (!stills || live || cell.id === playingCell)}
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
        <div className={controls ? 'absolute bottom-4 left-1/2 -translate-x-1/2 w-fit' : 'hidden'}>
          <Toolbar.Root
            size='sm'
            classNames='gap-1 px-2 py-1 rounded-md bg-modal-surface border border-separator shadow-md'
            data-testid='grid-toolbar'
          >
            <Button.Root
              variant='ghost'
              iconOnly
              icon='ph--arrow-counter-clockwise--regular'
              label='Replay'
              onClick={() => {
                seekTo(0);
                setRun((run) => run + 1);
              }}
            />
            <Button.Root
              variant='ghost'
              iconOnly
              icon='ph--caret-left--regular'
              label='Previous close-up'
              disabled={backward === undefined || step !== undefined}
              onClick={() => setStep(backward)}
            />
            <Input.Switch
              label='Autoplay'
              checked={autoplay}
              onCheckedChange={({ checked }) => {
                setOffset(elapsed);
                setAutoplay(checked);
              }}
            />
            <Button.Root
              variant='ghost'
              iconOnly
              icon='ph--caret-right--regular'
              label='Next close-up'
              disabled={forward === undefined || step !== undefined}
              onClick={() => setStep(forward)}
            />
            <Toolbar.Text classNames='text-fg-muted font-mono text-sm whitespace-nowrap'>
              {(elapsed / 1_000).toFixed(1)}s / {(total / 1_000).toFixed(0)}s ·{' '}
              {camera ? `${camera.zoom.toFixed(2)}×` : '—'}
            </Toolbar.Text>
          </Toolbar.Root>
        </div>
      </div>
    </div>
  );
};

/** Seeks a clip to `time` seconds, resolving once the frame is decoded (or at once if it is already there). */
const seekVideo = (video: HTMLVideoElement, time: number): Promise<void> | undefined => {
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
