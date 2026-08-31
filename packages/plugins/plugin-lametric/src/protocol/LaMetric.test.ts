//
// Copyright 2026 DXOS.org
//

import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as LaMetric from '#protocol';

const decode = Schema.decodeUnknownSync(LaMetric.Payload);

describe('LaMetric payload', () => {
  test('accepts a text frame and a goal frame', ({ expect }) => {
    const payload = decode({
      frames: [{ text: '42 objects' }, { goalData: { start: 0, current: 45, end: 100, unit: '%' } }],
    });
    expect(payload.frames).toHaveLength(2);
  });

  test('rejects a frame that is neither', ({ expect }) => {
    expect(() => decode({ frames: [{ nonsense: true }] })).toThrow();
  });

  test('local push addresses the stock DIY app, cloud push a published one', ({ expect }) => {
    expect(LaMetric.localWidgetPath('diy-uuid')).toBe('/api/v2/widget/update/com.lametric.diy.devwidget/diy-uuid');
    expect(LaMetric.cloudWidgetPath('com.lametric.abc', '123')).toBe('/api/v1/dev/widget/update/com.lametric.abc/123');
  });
});
