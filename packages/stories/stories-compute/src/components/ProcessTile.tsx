//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import React, { useEffect, useState } from 'react';

import * as Process from '@dxos/compute/Process';
import { EffectEx } from '@dxos/effect';
import { Block, Button, Card, Focus } from '@dxos/react-ui';
import { Mosaic, type MosaicStackTileComponent } from '@dxos/react-ui-mosaic';

import { HEIGHT, type MandelbrotOutput, WIDTH } from '../testing/index.ts';

export type ProcessItem = {
  id: string;
  location: Process.Location;
  handle: Process.Handle<void, MandelbrotOutput, never>;
};

const TERMINAL_STATES: readonly Process.State[] = [
  Process.State.SUCCEEDED,
  Process.State.FAILED,
  Process.State.TERMINATED,
];

const formatElapsed = (ms: number): string => {
  const seconds = Math.floor(ms / 1_000);
  return `${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}`;
};

/** Re-renders once a second while `active`, so elapsed time advances without a status change. */
const useNow = (active: boolean): number => {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    if (!active) {
      return;
    }
    const interval = setInterval(() => setNow(Date.now()), 1_000);
    return () => clearInterval(interval);
  }, [active]);
  return now;
};

/** Maps an escape count to RGB; points that never escape are black. */
const colorFor = (iterations: number, maxIterations: number): [number, number, number] => {
  if (iterations >= maxIterations) {
    return [0, 0, 0];
  }
  const t = Math.sqrt(iterations / maxIterations);
  return [Math.round(255 * Math.min(1, 3 * t)), Math.round(255 * t * t), Math.round(255 * (1 - t) * 0.8 + 50 * t)];
};

const paintBand = (context: CanvasRenderingContext2D, band: MandelbrotOutput) => {
  const rows = band.data.length / WIDTH;
  const image = context.createImageData(WIDTH, rows);
  band.data.forEach((iterations, index) => {
    const [red, green, blue] = colorFor(iterations, band.maxIterations);
    image.data.set([red, green, blue, 255], index * 4);
  });
  context.putImageData(image, 0, band.y);
};

/**
 * Paints each output band onto the canvas and returns the frame being rendered; the subscription
 * also drives a remote handle's status polling.
 */
const useMandelbrot = (handle: ProcessItem['handle'], canvas: HTMLCanvasElement | null): number | undefined => {
  const [frame, setFrame] = useState<number>();
  useEffect(() => {
    const context = canvas?.getContext('2d');
    if (!context) {
      return;
    }
    const fiber = Effect.runFork(
      Stream.runForEach(handle.subscribeOutputs(), (band) =>
        Effect.sync(() => {
          paintBand(context, band);
          setFrame(band.frame);
        }),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [handle, canvas]);
  return frame;
};

export const ProcessTile: MosaicStackTileComponent<ProcessItem> = (props) => {
  const { handle, location } = props.data;
  const status = useAtomValue(handle.statusAtom);
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const frame = useMandelbrot(handle, canvas);
  const terminal = TERMINAL_STATES.includes(status.state);
  const now = useNow(!terminal);
  const end = Option.match(status.completedAt, { onNone: () => now, onSome: (date) => date.getTime() });

  const handleKill = () => {
    void EffectEx.runPromise(handle.terminate());
  };

  return (
    <Mosaic.Tile {...props} asChild>
      <Focus.Item asChild>
        <Card.Root classNames='dx-hover' data-testid='process-tile'>
          <Card.Header>
            <Card.Title classNames='font-mono'>{handle.pid}</Card.Title>
            <Block rail='end'>
              <Button
                iconOnly
                variant='ghost'
                icon='ph--x-circle--regular'
                label='Kill'
                disabled={terminal}
                onClick={handleKill}
                data-testid='process-kill'
              />
            </Block>
          </Card.Header>
          <Card.Row>
            <div className='grid grid-cols-[auto_1fr] gap-x-3 text-sm'>
              <span className='text-fg-muted'>Location</span>
              <span data-testid='process-location'>{location}</span>
              <span className='text-fg-muted'>State</span>
              <span data-testid='process-state'>{status.state}</span>
              <span className='text-fg-muted'>Elapsed</span>
              <span className='font-mono'>{formatElapsed(end - status.startedAt.getTime())}</span>
              <span className='text-fg-muted'>Frame</span>
              <span className='font-mono' data-testid='process-output'>
                {frame ?? '—'}
              </span>
            </div>
          </Card.Row>
          <Card.Row>
            <canvas
              ref={setCanvas}
              width={WIDTH}
              height={HEIGHT}
              className='w-full aspect-[4/3] rounded-sm bg-black [image-rendering:pixelated]'
            />
          </Card.Row>
        </Card.Root>
      </Focus.Item>
    </Mosaic.Tile>
  );
};

ProcessTile.displayName = 'ProcessTile';
