//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Obj } from '@dxos/echo';

import * as Video from './Video';

describe('Video', () => {
  test('make sets name and url, leaving transcript unset', ({ expect }) => {
    const video = Video.make({ name: 'Demo', url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ' });
    expect(Obj.instanceOf(Video.Video, video)).toBe(true);
    expect(video.name).toBe('Demo');
    expect(video.url).toBe('https://www.youtube.com/watch?v=dQw4w9WgXcQ');
    expect(video.transcript).toBeUndefined();
  });

  test('accepts a URL containing a query string', ({ expect }) => {
    const url = 'https://example.com/watch?v=abc&t=42s';
    const video = Video.make({ url });
    expect(video.url).toBe(url);
  });
});
