//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { DEFAULT_IGNORED_APPS, appDisplayName, defaultMeetingName, selectMeetingApp } from './policy.ts';

describe('policy', () => {
  test('ignores dictation and screen recorders', ({ expect }) => {
    expect(selectMeetingApp([{ id: 'com.superduper.superwhisper', name: 'superwhisper' }])).toBeUndefined();
    expect(selectMeetingApp([{ id: 'com.loom.desktop', name: 'Loom' }])).toBeUndefined();
  });

  test('prefers a known meeting app over an unknown one', ({ expect }) => {
    const app = selectMeetingApp([
      { id: 'com.example.tuner', name: 'Tuner' },
      { id: 'us.zoom.xos', name: 'zoom.us' },
    ]);
    expect(app?.id).toBe('us.zoom.xos');
  });

  test('falls back to any app that is not ignored', ({ expect }) => {
    expect(selectMeetingApp([{ id: 'pid:42', name: 'Whereby' }])?.name).toBe('Whereby');
  });

  test('honours a custom ignore list', ({ expect }) => {
    expect(selectMeetingApp([{ id: 'us.zoom.xos', name: 'zoom.us' }], ['us.zoom.xos'])).toBeUndefined();
    expect(selectMeetingApp([{ id: 'com.loom.desktop', name: 'Loom' }], [])?.id).toBe('com.loom.desktop');
    expect(DEFAULT_IGNORED_APPS).not.toContain('us.zoom.xos');
  });

  test('names meetings after the app', ({ expect }) => {
    expect(appDisplayName({ id: 'us.zoom.xos', name: 'zoom.us' })).toBe('Zoom');
    const date = new Date(2026, 9, 13, 11, 5);
    expect(defaultMeetingName({ id: 'us.zoom.xos', name: 'zoom.us' }, date)).toBe('Zoom meeting · Oct 13, 11:05 AM');
    expect(defaultMeetingName(undefined, date)).toBe('Meeting · Oct 13, 11:05 AM');
  });
});
