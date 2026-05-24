//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import {
  type SegmentKind,
  formatSegments,
  incrementSegment,
  parseSegments,
  resolveDateSegmentOrder,
  resolveHourCycle,
  resolveTimeSegmentOrder,
} from './segments';

describe('resolveDateSegmentOrder', () => {
  test('en-US returns MM dd yyyy', ({ expect }) => {
    expect(resolveDateSegmentOrder('en-US')).toEqual(['MM', 'dd', 'yyyy']);
  });

  test('de-DE returns dd MM yyyy', ({ expect }) => {
    expect(resolveDateSegmentOrder('de-DE')).toEqual(['dd', 'MM', 'yyyy']);
  });

  test('ja-JP returns yyyy MM dd', ({ expect }) => {
    expect(resolveDateSegmentOrder('ja-JP')).toEqual(['yyyy', 'MM', 'dd']);
  });
});

describe('resolveHourCycle', () => {
  test('en-US defaults to h12', ({ expect }) => {
    expect(resolveHourCycle('en-US')).toBe('h12');
  });

  test('de-DE defaults to h23', ({ expect }) => {
    expect(resolveHourCycle('de-DE')).toBe('h23');
  });
});

describe('resolveTimeSegmentOrder', () => {
  test('h12 returns hh mm a', ({ expect }) => {
    expect(resolveTimeSegmentOrder('h12')).toEqual(['hh', 'mm', 'a']);
  });

  test('h23 returns HH mm', ({ expect }) => {
    expect(resolveTimeSegmentOrder('h23')).toEqual(['HH', 'mm']);
  });
});

describe('formatSegments / parseSegments', () => {
  test('format then parse round-trips a Date', ({ expect }) => {
    const date = new Date(2026, 4, 24, 14, 30); // May 24 2026, 14:30
    const segments = formatSegments(date, { dateOrder: ['MM', 'dd', 'yyyy'], timeOrder: ['HH', 'mm'] });
    const parsed = parseSegments(segments);
    expect(parsed?.getTime()).toBe(date.getTime());
  });

  test('parseSegments returns undefined when any required segment is empty', ({ expect }) => {
    const segments = { yyyy: '2026', MM: '05', dd: '', HH: '14', mm: '30' };
    expect(parseSegments(segments)).toBeUndefined();
  });

  test('parseSegments handles 12h with PM', ({ expect }) => {
    const segments = { yyyy: '2026', MM: '05', dd: '24', hh: '2', mm: '30', a: 'PM' };
    const parsed = parseSegments(segments);
    expect(parsed?.getHours()).toBe(14);
    expect(parsed?.getMinutes()).toBe(30);
  });

  test('parseSegments handles 12am as midnight', ({ expect }) => {
    const segments = { yyyy: '2026', MM: '05', dd: '24', hh: '12', mm: '00', a: 'AM' };
    expect(parseSegments(segments)?.getHours()).toBe(0);
  });

  test('parseSegments handles 12pm as noon', ({ expect }) => {
    const segments = { yyyy: '2026', MM: '05', dd: '24', hh: '12', mm: '00', a: 'PM' };
    expect(parseSegments(segments)?.getHours()).toBe(12);
  });
});

describe('incrementSegment', () => {
  test('yyyy +1 increments year', ({ expect }) => {
    expect(incrementSegment('yyyy', '2026', 1)).toBe('2027');
  });

  test('MM rolls 12 -> 01 on +1 (clamp-wrap)', ({ expect }) => {
    expect(incrementSegment('MM', '12', 1)).toBe('01');
  });

  test('MM rolls 01 -> 12 on -1', ({ expect }) => {
    expect(incrementSegment('MM', '01', -1)).toBe('12');
  });

  test('dd rolls 31 -> 01 on +1', ({ expect }) => {
    expect(incrementSegment('dd', '31', 1)).toBe('01');
  });

  test('HH rolls 23 -> 00 on +1', ({ expect }) => {
    expect(incrementSegment('HH', '23', 1)).toBe('00');
  });

  test('mm rolls 59 -> 00 on +1', ({ expect }) => {
    expect(incrementSegment('mm', '59', 1)).toBe('00');
  });

  test('a toggles between AM and PM', ({ expect }) => {
    expect(incrementSegment('a', 'AM', 1)).toBe('PM');
    expect(incrementSegment('a', 'PM', 1)).toBe('AM');
    expect(incrementSegment('a', 'AM', -1)).toBe('PM');
  });

  test('hh rolls 12 -> 1 on +1', ({ expect }) => {
    expect(incrementSegment('hh', '12', 1)).toBe('1');
  });
});

// `SegmentKind` is the union 'yyyy' | 'MM' | 'dd' | 'HH' | 'hh' | 'mm' | 'a'.
// Compile-time-only assertion (no runtime test): the type must be exported.
const _typecheck: SegmentKind = 'yyyy';
void _typecheck;
