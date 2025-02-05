//
// Copyright 2024 DXOS.org
//

import { invariant } from '@dxos/invariant';

export const blackCanvasStreamTrack = (videoTrack?: MediaStreamTrack) => {
  const canvas = document.createElement('canvas');
  canvas.width = videoTrack?.getSettings().width ?? 1280;
  canvas.height = videoTrack?.getSettings().height ?? 720;

  const ctx = canvas.getContext('2d');
  invariant(ctx);
  ctx.fillStyle = 'black';
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  // TODO(burdon): When is the interval stopped?
  // We need to draw to the canvas in order for video frames to be sent on the video track.
  setInterval(() => {
    ctx.fillStyle = 'black';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  }, 1_000);

  return canvas.captureStream().getVideoTracks()[0];
};
