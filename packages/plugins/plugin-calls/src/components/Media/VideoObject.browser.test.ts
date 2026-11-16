//
// Copyright 2026 DXOS.org
//

import { createElement } from 'react';
import { flushSync } from 'react-dom';
import { createRoot } from 'react-dom/client';
import { afterEach, describe, test } from 'vitest';

import { VideoObject } from './VideoObject.tsx';

const makeStream = (): MediaStream => {
  const canvas = document.createElement('canvas');
  canvas.getContext('2d')?.fillRect(0, 0, 1, 1);
  return canvas.captureStream(1);
};

describe('VideoObject', () => {
  const container = document.createElement('div');
  const root = createRoot(container);
  afterEach(() => flushSync(() => root.render(null)));

  test('drops the stream when it is unset, so the last frame does not stay on screen', ({ expect }) => {
    const stream = makeStream();
    flushSync(() => root.render(createElement(VideoObject, { videoStream: stream })));
    const video = container.querySelector('video');
    expect(video?.srcObject).toBe(stream);

    flushSync(() => root.render(createElement(VideoObject, { videoStream: undefined })));
    expect(video?.srcObject).toBeNull();
  });
});
