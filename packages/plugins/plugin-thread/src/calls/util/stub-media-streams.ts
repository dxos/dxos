//
// Copyright 2025 DXOS.org
//
//

import { scheduleTaskInterval, waitForCondition } from '@dxos/async';
import { type Context, cancelWithContext } from '@dxos/context';
import { invariant } from '@dxos/invariant';

/**
 * Creates a black canvas stream track.
 * We need this to to have black rectangle video that is live (have frames) when video feed is disabled.
 */
export const createBlackCanvasStreamTrack = async ({
  ctx,
  width,
  height,
}: {
  ctx: Context;
  width: number;
  height: number;
}): Promise<MediaStreamTrack> => {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;

  const canvasCtx = canvas.getContext('2d');
  invariant(canvasCtx);
  const drawFrame = () => {
    canvasCtx.fillStyle = 'black';
    canvasCtx.fillRect(0, 0, canvas.width, canvas.height);
  };
  scheduleTaskInterval(ctx, async () => drawFrame(), 200);

  const track = canvas.captureStream().getVideoTracks()[0];
  drawFrame();

  await cancelWithContext(ctx, waitForCondition({ condition: () => track.readyState === 'live', timeout: 1_000 }));

  return track;
};

/**
 * Creates an inaudible audio stream track.
 * We need this to have audio track available when audio is disabled.
 */
export const createInaudibleAudioStreamTrack = async ({ ctx }: { ctx: Context }): Promise<MediaStreamTrack> => {
  const audioContext = new window.AudioContext();
  const oscillator = audioContext.createOscillator();
  oscillator.type = 'triangle';
  // roughly sounds like a box fan
  oscillator.frequency.setValueAtTime(20, audioContext.currentTime);

  const gainNode = audioContext.createGain();
  gainNode.gain.setValueAtTime(0.01, audioContext.currentTime);
  oscillator.connect(gainNode);

  const destination = audioContext.createMediaStreamDestination();
  gainNode.connect(destination);
  oscillator.start();

  ctx.onDispose(async () => {
    oscillator.disconnect();
    oscillator.stop();
    await audioContext.close();
  });

  return destination.stream.getAudioTracks()[0];
};
