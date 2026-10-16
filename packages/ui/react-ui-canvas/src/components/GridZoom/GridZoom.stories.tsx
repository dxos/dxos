//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { useViewport } from '../../hooks/index.ts';
import { type Bounds, type Camera } from '../../model/types.ts';
import { easeInOut, fitBounds, interpolateCamera, screenBounds } from '../../utils/camera.ts';

/** Clips are read from the gitignored `temp/grid-zoom/clip-NN.mp4` at the repo root; missing ones show a placeholder. */
const CLIPS_DIR = '../../../../../../temp/grid-zoom/';

const TILE = { width: 960, height: 540 };

type GridZoomProps = {
  cols: number;
  rows: number;
  /** Scene-unit gap between tiles. */
  gap: number;
  /**
   * Cells (`[col, row]`) the camera visits in turn, each filling the view and playing `tour-<n>.mp4`; a cell outside
   * the grid (a negative column) is added to it. Unset is three cells of row 3 ending in the bottom-left quadrant.
   */
  tour?: [number, number][];
  /** Time held on each toured tile, in ms. */
  hold: number;
  /** Time to pan from one toured tile to the next, in ms. */
  pan: number;
  /** Final zoom-out time, in ms. */
  duration: number;
  /** Shows the replay button and timing readout; off for a recording, which must carry no overlay. */
  controls?: boolean;
  /**
   * Renders one frame at a time instead of in real time: the clips pause, and `window.gridZoom.seek(ms)` moves the
   * camera and every visible clip to `ms`, so a recorder can screenshot exact frames at any rate.
   */
  stepped?: boolean;
};

declare global {
  interface Window {
    gridZoom?: { total: number; seek: (ms: number) => Promise<void> };
  }
}

/** One leg of the camera's path: held on a tile (`focus`), or moving between two cameras. */
type Shot = { ms: number; focus?: string; move?: (t: number) => Camera; camera?: Camera };

/** Three cells of row 3, the last in the bottom-left quadrant of a 6x6 grid. */
const DEFAULT_TOUR: [number, number][] = [
  [0, 3],
  [1, 3],
  [2, 3],
];

/** A straight slide between two cameras at the same zoom, so a pan never zooms out and back in. */
const slide =
  (from: Camera, to: Camera) =>
  (t: number): Camera => ({
    zoom: from.zoom + (to.zoom - from.zoom) * t,
    x: from.x + (to.x - from.x) * t,
    y: from.y + (to.y - from.y) * t,
  });

type TileProps = {
  /** The clip's file name, without extension. */
  clip: string;
  /** Shown when the clip is missing. */
  label: string;
  bounds: Bounds;
  /** Called with the clip once its length is known, or with nothing if it has no clip. */
  onLoad?: (video?: HTMLVideoElement) => void;
  /** Plays in real time; off when the story is stepped and the clip is seeked frame by frame. */
  playing: boolean;
};

const Tile = ({ clip, label, bounds, onLoad, playing }: TileProps) => {
  const [failed, setFailed] = useState(false);
  // A non-literal URL so Vite resolves it at runtime instead of bundling a file that only exists locally.
  const src = useMemo(() => new URL(`${CLIPS_DIR}${clip}.mp4`, import.meta.url).href, [clip]);
  return (
    <div
      className='absolute overflow-hidden rounded-sm bg-base-surface'
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
    >
      {failed ? (
        <div className='grid dx-fill place-items-center text-[120px] text-neutral-500'>{label}</div>
      ) : (
        <video
          className='dx-fill object-cover'
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
  pan,
  duration,
  controls = true,
  stepped = false,
}: GridZoomProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const viewport = useViewport(ref);
  const [elapsed, setElapsed] = useState(0);
  const [run, setRun] = useState(0);
  const videos = useRef(new Map<string, HTMLVideoElement>());
  // The tour starts once its first tile has loaded (or turned out to have no clip).
  const [ready, setReady] = useState(false);
  const tour = useMemo(() => tourProp ?? DEFAULT_TOUR, [tourProp]);

  /** Every cell drawn: the grid's, then any tour cell outside it; a tour cell plays its own clip. */
  const cells = useMemo(() => {
    const key = ([col, row]: [number, number]) => `${col},${row}`;
    const steps = new Map(tour.map((cell, step) => [key(cell), step]));
    const grid = Array.from({ length: cols * rows }, (_, index): [number, number] => [
      index % cols,
      Math.floor(index / cols),
    ]);
    const outside = tour.filter(([col, row]) => col < 0 || col >= cols || row < 0 || row >= rows);
    return [...grid, ...outside].map((cell) => {
      const [col, row] = cell;
      const step = steps.get(key(cell));
      return {
        id: key(cell),
        clip: step === undefined ? `clip-${String(row * cols + col).padStart(2, '0')}` : `tour-${step + 1}`,
        label: step === undefined ? String(row * cols + col + 1) : `Demo ${step + 1}`,
        bounds: { x: col * (TILE.width + gap), y: row * (TILE.height + gap), ...TILE },
      };
    });
  }, [tour, cols, rows, gap]);

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
    const cameras = tour.map(([col, row]) =>
      fitBounds({ x: col * (TILE.width + gap), y: row * (TILE.height + gap), ...TILE }, viewport),
    );
    return tour.flatMap(([col, row], step): Shot[] => {
      const from = cameras[step];
      const last = step === cameras.length - 1;
      const focus = `${col},${row}`;
      return [
        { ms: hold, focus, camera: from },
        last
          ? { ms: duration, move: interpolateCamera(from, fitBounds(extent, viewport, gap), viewport) }
          : { ms: pan, move: slide(from, cameras[step + 1]) },
      ];
    });
  }, [cells, tour, viewport, gap, hold, pan, duration]);
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
    shots.reduce((start, shot) => {
      if (shot.focus) {
        holdStart.set(shot.focus, start);
      }
      return start + shot.ms;
    }, 0);
    window.gridZoom = {
      total,
      seek: async (ms) => {
        setElapsed(ms);
        const { shot, t } = shotAt(shots, ms);
        const camera = shot.camera ?? shot.move?.(easeInOut(t));
        if (!camera) {
          return;
        }
        await Promise.all(
          cells.map((cell) => {
            const video = videos.current.get(cell.id);
            const box = screenBounds(camera, cell.bounds);
            const onScreen =
              box.x < viewport.width && box.y < viewport.height && box.x + box.width > 0 && box.y + box.height > 0;
            if (!video || !onScreen || !Number.isFinite(video.duration)) {
              return undefined;
            }
            const start = holdStart.get(cell.id);
            const time = (Math.max(0, start === undefined ? ms : ms - start) / 1_000) % video.duration;
            if (Math.abs(video.currentTime - time) < 0.001) {
              return undefined;
            }
            return new Promise<void>((resolve) => {
              video.addEventListener('seeked', () => resolve(), { once: true });
              video.currentTime = time;
            });
          }),
        );
        // Two frames: one for React to commit the camera, one for the compositor to paint it.
        await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));
      },
    };
    return () => {
      delete window.gridZoom;
    };
  }, [ready, shots, total, stepped, cells, viewport]);

  const { shot, t } = shotAt(shots, elapsed);
  const camera = shot?.camera ?? shot?.move?.(easeInOut(t));

  return (
    <div ref={ref} className='relative dx-fill overflow-hidden bg-neutral-950'>
      {/* Placed in screen space rather than under one scaled container: Chrome stops painting videos in a layer scaled far down. */}
      {camera &&
        cells.map((cell) => (
          <Tile
            key={cell.id}
            clip={cell.clip}
            label={cell.label}
            bounds={screenBounds(camera, cell.bounds)}
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
        ))}
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

const meta: Meta<GridZoomProps> = {
  title: 'ui/react-ui-canvas/GridZoom',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

type Story = StoryObj<GridZoomProps>;

export const Default: Story = {
  args: { cols: 6, rows: 6, gap: 32, hold: 10_000, pan: 1_500, duration: 12_000, controls: true, stepped: false },
};
