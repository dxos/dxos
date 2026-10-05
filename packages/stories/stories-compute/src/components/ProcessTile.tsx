//
// Copyright 2026 DXOS.org
//

import { useAtomValue } from '@effect/atom-react/Hooks';
import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Option from 'effect/Option';
import * as Stream from 'effect/Stream';
import React, { useEffect, useRef, useState } from 'react';

import * as Process from '@dxos/compute/Process';
import { EffectEx } from '@dxos/effect';
import { Block, Card, Icon } from '@dxos/react-ui';

import {
  DEFAULT_SIZE,
  type MandelbrotInput,
  type MandelbrotOutput,
  type MandelbrotParams,
  decodeFrame,
} from '../testing/index.ts';

export type ProcessItem = {
  id: string;
  location: Process.Location;
  /** Sent with the first request; an absent `center` lets the process pick one at random. */
  params: MandelbrotParams;
  handle: Process.Handle<MandelbrotInput, MandelbrotOutput, never>;
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

/** Frames granted per request; topped up before they run out so the push never stalls. */
const BATCH = 5;
const LOW_WATER = 2;

/** Maps an intensity byte to RGB; 0 (inside the set) is black. */
const colorFor = (value: number): [number, number, number] => {
  if (value === 0) {
    return [0, 0, 0];
  }
  const t = value / 255;
  return [Math.round(255 * Math.min(1, 3 * t)), Math.round(255 * t * t), Math.round(255 * (1 - t) * 0.8 + 50 * t)];
};

const paintFrame = (context: CanvasRenderingContext2D, output: MandelbrotOutput) => {
  const image = context.createImageData(output.size, output.size);
  decodeFrame(output.data).forEach((value, index) => {
    image.data.set([...colorFor(value), 255], index * 4);
  });
  context.putImageData(image, 0, 0);
};

/**
 * Drives the process on credit: grants {@link BATCH} frames, paints each frame the process pushes, and
 * grants another batch when only {@link LOW_WATER} remain. Nothing is granted once the card unmounts,
 * so the process drains its credit, idles and exits on its own. The subscription also drives a remote
 * handle's status polling.
 */
const useMandelbrot = (item: ProcessItem, canvas: HTMLCanvasElement | null): number | undefined => {
  const { handle, params } = item;
  const [frame, setFrame] = useState<number>();
  // Survives a StrictMode remount, so credit is granted once however often the effect re-runs.
  const granted = useRef(0);
  useEffect(() => {
    const context = canvas?.getContext('2d');
    if (!context) {
      return;
    }
    const grant = (input: MandelbrotInput) => {
      granted.current += input.frames;
      void EffectEx.runPromise(handle.submitInput(input));
    };

    const fiber = Effect.runFork(
      Stream.runForEach(handle.subscribeOutputs(), (output) =>
        Effect.sync(() => {
          if (canvas && canvas.width !== output.size) {
            canvas.width = output.size;
            canvas.height = output.size;
          }
          paintFrame(context, output);
          setFrame(output.frame);
          if (granted.current - (output.frame + 1) <= LOW_WATER) {
            grant({ frames: BATCH });
          }
        }),
      ),
    );
    if (granted.current === 0) {
      grant({ frames: BATCH, ...params });
    }
    return () => {
      Effect.runFork(Fiber.interrupt(fiber));
    };
  }, [handle, params, canvas]);
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
  const frame = useMandelbrot(item, canvas);
  const terminal = TERMINAL_STATES.includes(status.state);
  const now = useNow(!terminal);
  const end = Option.match(status.completedAt, { onNone: () => now, onSome: (date) => date.getTime() });

  const handleKill = () => {
    void EffectEx.runPromise(handle.terminate());
  };

  return (
    <Card.Root grid data-testid='process-tile'>
      <Card.Header>
        <Block>
          <Icon icon='ph--cpu--regular' />
        </Block>
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
          width={item.params.size ?? DEFAULT_SIZE}
          height={item.params.size ?? DEFAULT_SIZE}
          className='w-full aspect-square rounded-sm bg-black [image-rendering:pixelated]'
        />
      </Card.Row>
    </Card.Root>
  );
};
