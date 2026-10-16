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
  /** Tiles the camera visits in turn, each filling the view; unset is the centre tile and the two to its right. */
  tour?: number[];
  /** Time held on each toured tile, in ms. */
  hold: number;
  /** Time to pan from one toured tile to the next, in ms. */
  pan: number;
  /** Final zoom-out time, in ms. */
  duration: number;
};

/** One leg of the camera's path: held on a tile (`focus`), or moving between two cameras. */
type Shot = { ms: number; focus?: number; move?: (t: number) => Camera; camera?: Camera };

type TileProps = {
  index: number;
  bounds: Bounds;
  /** Called with the clip once its length is known, or with nothing if it has no clip. */
  onLoad?: (video?: HTMLVideoElement) => void;
};

const Tile = ({ index, bounds, onLoad }: TileProps) => {
  const [failed, setFailed] = useState(false);
  // A non-literal URL so Vite resolves it at runtime instead of bundling a file that only exists locally.
  const src = useMemo(
    () => new URL(`${CLIPS_DIR}clip-${String(index).padStart(2, '0')}.mp4`, import.meta.url).href,
    [index],
  );
  return (
    <div
      className='absolute overflow-hidden rounded-sm bg-neutral-800'
      style={{ left: bounds.x, top: bounds.y, width: bounds.width, height: bounds.height }}
    >
      {failed ? (
        <div className='grid dx-fill place-items-center text-[120px] text-neutral-500'>{index + 1}</div>
      ) : (
        <video
          className='dx-fill object-cover'
          src={src}
          autoPlay
          muted
          loop
          playsInline
          // Chrome pauses muted autoplay video while it is off-screen and does not reliably resume it.
          onPause={(event) => void event.currentTarget.play().catch(() => {})}
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
 * A grid of looping clips under one camera: it opens on a tile filling the view, holds while its clip plays, pans to
 * each further tile of the tour in turn, then zooms out along `interpolateCamera`'s path until the whole grid fits.
 */
const DefaultStory = ({ cols, rows, gap, tour: tourProp, hold, pan, duration }: GridZoomProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const viewport = useViewport(ref);
  const [elapsed, setElapsed] = useState(0);
  const [run, setRun] = useState(0);
  const videos = useRef(new Map<number, HTMLVideoElement>());
  // The tour starts once its first tile has loaded (or turned out to have no clip).
  const [ready, setReady] = useState(false);
  const centre = Math.floor((rows - 1) / 2) * cols + Math.floor((cols - 1) / 2);
  const tour = useMemo(() => tourProp ?? [centre, centre + 1, centre + 2], [tourProp, centre]);

  const tiles = useMemo(
    () =>
      Array.from({ length: cols * rows }, (_, index) => ({
        x: (index % cols) * (TILE.width + gap),
        y: Math.floor(index / cols) * (TILE.height + gap),
        ...TILE,
      })),
    [cols, rows, gap],
  );

  const shots = useMemo((): Shot[] => {
    if (viewport.width === 0) {
      return [];
    }
    const grid = {
      x: 0,
      y: 0,
      width: cols * TILE.width + (cols - 1) * gap,
      height: rows * TILE.height + (rows - 1) * gap,
    };
    const cameras = tour.filter((index) => tiles[index]).map((index) => fitBounds(tiles[index], viewport));
    return tour.flatMap((focus, step): Shot[] => {
      const from = cameras[step];
      const last = step === cameras.length - 1;
      const to = last ? fitBounds(grid, viewport, gap) : cameras[step + 1];
      return [
        { ms: hold, focus, camera: from },
        { ms: last ? duration : pan, move: interpolateCamera(from, to, viewport) },
      ];
    });
  }, [tiles, tour, viewport, cols, rows, gap, hold, pan, duration]);
  const total = shots.reduce((sum, shot) => sum + shot.ms, 0);

  useEffect(() => {
    if (!ready || shots.length === 0) {
      return;
    }
    let frame = 0;
    let focused: number | undefined;
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
  }, [run, ready, shots, total]);

  const { shot, t } = shotAt(shots, elapsed);
  const camera = shot?.camera ?? shot?.move?.(easeInOut(t));

  return (
    <div ref={ref} className='relative dx-fill overflow-hidden bg-black'>
      {/* Placed in screen space rather than under one scaled container: Chrome stops painting videos in a layer scaled far down. */}
      {camera &&
        tiles.map((bounds, index) => (
          <Tile
            key={index}
            index={index}
            bounds={screenBounds(camera, bounds)}
            onLoad={(video) => {
              if (video) {
                videos.current.set(index, video);
              }
              if (index === tour[0]) {
                setReady(true);
              }
            }}
          />
        ))}
      <div className='absolute top-2 left-2 w-fit'>
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
  args: { cols: 6, rows: 6, gap: 32, hold: 10_000, pan: 1_500, duration: 12_000 },
};
