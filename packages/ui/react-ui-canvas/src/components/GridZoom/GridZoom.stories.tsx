//
// Copyright 2026 DXOS.org
//

import { type Meta, type StoryObj } from '@storybook/react-vite';
import React, { useEffect, useMemo, useRef, useState } from 'react';

import * as Button from '@dxos/react-ui/Button';
import { withLayout, withTheme } from '@dxos/react-ui/testing';
import * as Toolbar from '@dxos/react-ui/Toolbar';

import { useViewport } from '../../hooks/index.ts';
import { type Bounds } from '../../model/types.ts';
import { easeInOut, fitBounds, interpolateCamera, screenBounds } from '../../utils/camera.ts';

/** Clips are read from the gitignored `temp/grid-zoom/clip-NN.mp4` at the repo root; missing ones show a placeholder. */
const CLIPS_DIR = '../../../../../../temp/grid-zoom/';

const TILE = { width: 960, height: 540 };

type GridZoomProps = {
  cols: number;
  rows: number;
  /** Scene-unit gap between tiles. */
  gap: number;
  /** Zoom-out time, in ms. */
  duration: number;
  /** Time held on the first tile before zooming out, in ms; unset holds for the length of the first tile's clip. */
  hold?: number;
};

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
 * A grid of looping clips under one camera: it opens on the centre tile filling the view, plays that tile's clip once
 * through, then zooms out along `interpolateCamera`'s path until the whole grid fits.
 */
const DefaultStory = ({ cols, rows, gap, duration, hold }: GridZoomProps) => {
  const ref = useRef<HTMLDivElement>(null);
  const viewport = useViewport(ref);
  const [progress, setProgress] = useState(0);
  const [run, setRun] = useState(0);
  // The first tile's clip, once loaded; `null` when that tile has no clip.
  const [first, setFirst] = useState<HTMLVideoElement | null>();
  const firstIndex = Math.floor((rows - 1) / 2) * cols + Math.floor((cols - 1) / 2);

  const tiles = useMemo(
    () =>
      Array.from({ length: cols * rows }, (_, index) => ({
        x: (index % cols) * (TILE.width + gap),
        y: Math.floor(index / cols) * (TILE.height + gap),
        ...TILE,
      })),
    [cols, rows, gap],
  );

  const interpolate = useMemo(() => {
    if (viewport.width === 0) {
      return undefined;
    }
    const centre = tiles[firstIndex];
    const grid = {
      x: 0,
      y: 0,
      width: cols * TILE.width + (cols - 1) * gap,
      height: rows * TILE.height + (rows - 1) * gap,
    };
    return interpolateCamera(fitBounds(centre, viewport), fitBounds(grid, viewport, gap), viewport);
  }, [tiles, viewport, firstIndex, cols, rows, gap]);

  useEffect(() => {
    if (hold === undefined && first === undefined) {
      return;
    }
    // Restart the first clip so the hold shows it from its beginning to its end.
    if (first) {
      first.currentTime = 0;
      void first.play().catch(() => {});
    }
    const holdMs = hold ?? (first ? first.duration * 1_000 : 0);
    let frame = 0;
    const start = performance.now();
    const tick = (now: number) => {
      const t = Math.min(1, Math.max(0, (now - start - holdMs) / duration));
      setProgress(t);
      if (t < 1) {
        frame = requestAnimationFrame(tick);
      }
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [run, duration, hold, first]);

  const camera = interpolate?.(easeInOut(progress));

  return (
    <div ref={ref} className='relative dx-fill overflow-hidden bg-black'>
      {/* Placed in screen space rather than under one scaled container: Chrome stops painting videos in a layer scaled far down. */}
      {camera &&
        tiles.map((bounds, index) => (
          <Tile
            key={index}
            index={index}
            bounds={screenBounds(camera, bounds)}
            onLoad={index === firstIndex ? (video) => setFirst((current) => current ?? video ?? null) : undefined}
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
            {Math.round(progress * 100)}% · {camera ? `${camera.zoom.toFixed(2)}×` : '—'}
          </Toolbar.Text>
        </Toolbar.Root>
      </div>
    </div>
  );
};

const meta: Meta<GridZoomProps> = {
  title: 'ui/react-ui-canvas/GridZoom',
  render: DefaultStory,
  decorators: [withTheme(), withLayout({ layout: 'fullscreen' })],
};

export default meta;

type Story = StoryObj<GridZoomProps>;

export const Default: Story = {
  args: { cols: 6, rows: 6, gap: 32, duration: 12_000 },
};
