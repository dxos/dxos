//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Fiber from 'effect/Fiber';
import * as Stream from 'effect/Stream';
import React, { useEffect, useRef, useState } from 'react';

import * as EffectEx from '@dxos/effect/EffectEx';
import { log } from '@dxos/log';

import {
  DEFAULT_FRAME_COUNT,
  DEFAULT_SIZE,
  type MandelbrotInput,
  type MandelbrotOutput,
  type MandelbrotParams,
  decodeFrame,
} from '../testing/index.ts';
import { ProcessCard } from './ProcessCard.tsx';
import { type SpawnedProcess } from './types.ts';

export type ProcessItem = SpawnedProcess<MandelbrotParams, MandelbrotInput, MandelbrotOutput>;

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
    // Never asks past the render's frame count; the process would finish there regardless.
    const grant = (input: MandelbrotInput) => {
      const remaining = (params.frameCount ?? DEFAULT_FRAME_COUNT) - granted.current;
      const frames = Math.min(input.frames, remaining);
      if (frames <= 0) {
        return;
      }
      granted.current += frames;
      void EffectEx.runPromise(handle.submitInput({ ...input, frames })).catch((error) => {
        // An undelivered grant is not owed: still counted, it would hold back every later top-up.
        granted.current -= frames;
        log.warn('frame grant failed', { pid: handle.pid, error });
      });
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
  const [canvas, setCanvas] = useState<HTMLCanvasElement | null>(null);
  const frame = useMandelbrot(item, canvas);
  return (
    <ProcessCard
      location={item.location}
      handle={item.handle}
      progress={`frame ${frame ?? '—'}`}
      onRemove={() => onRemove?.(item)}
    >
      <canvas
        ref={setCanvas}
        width={item.params.size ?? DEFAULT_SIZE}
        height={item.params.size ?? DEFAULT_SIZE}
        className='w-full aspect-square rounded-sm bg-black [image-rendering:pixelated]'
      />
    </ProcessCard>
  );
};
