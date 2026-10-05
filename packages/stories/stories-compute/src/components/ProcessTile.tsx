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
import { Card } from '@dxos/react-ui';

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

const paintFrame = (context: CanvasRenderingContext2D, output: MandelbrotOutput) => {
  const image = context.createImageData(WIDTH, HEIGHT);
  output.data.forEach((iterations, index) => {
    const [red, green, blue] = colorFor(iterations, output.maxIterations);
    image.data.set([red, green, blue, 255], index * 4);
  });
  context.putImageData(image, 0, 0);
};

/**
 * Paints each output frame onto the canvas and returns the frame being rendered; the subscription
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
      Stream.runForEach(handle.subscribeOutputs(), (output) =>
        Effect.sync(() => {
          paintFrame(context, output);
          setFrame(output.frame);
        }),
      ),
    );
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [handle, canvas]);
  return frame;
};

export type ProcessTileProps = {
  data: ProcessItem;
  /** Removes the card once its process has ended. */
  onRemove?: (item: ProcessItem) => void;
};

export const ProcessTile = ({ data: item, onRemove }: ProcessTileProps) => {
  const { handle, location } = item;
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
    <Card.Root grid data-testid='process-tile'>
      <Card.Header>
        <Card.Title truncate classNames='font-mono'>
          {handle.pid}
        </Card.Title>
        {terminal ? (
          <Card.Action system='delete' onClick={() => onRemove?.(item)} data-testid='process-remove' />
        ) : (
          <Card.Action icon='ph--stop-circle--regular' label='Kill' onClick={handleKill} data-testid='process-kill' />
        )}
      </Card.Header>
      <Card.Row
        icon={location === 'edge' ? 'ph--cloud--regular' : 'ph--laptop--regular'}
        data-testid='process-location'
      >
        <Card.Text>{location}</Card.Text>
      </Card.Row>
      <Card.Row icon='ph--pulse--regular' data-testid='process-state'>
        <Card.Text>{status.state}</Card.Text>
      </Card.Row>
      <Card.Row
        icon='ph--timer--regular'
        trailing={<Card.Text variant='muted'>frame {frame ?? '—'}</Card.Text>}
        data-testid='process-output'
      >
        <Card.Text classNames='font-mono'>{formatElapsed(end - status.startedAt.getTime())}</Card.Text>
      </Card.Row>
      <Card.Row span='full'>
        <canvas
          ref={setCanvas}
          width={WIDTH}
          height={HEIGHT}
          className='w-full aspect-[4/3] rounded-sm bg-black [image-rendering:pixelated]'
        />
      </Card.Row>
    </Card.Root>
  );
};
