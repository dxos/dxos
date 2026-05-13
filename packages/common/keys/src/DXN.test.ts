//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import * as DXN from './DXN';

describe('DXN.isDXN', () => {
  test('accepts new-format DXNs', ({ expect }) => {
    expect(DXN.isDXN('dxn:org.dxos.type.calendar')).toBe(true);
    expect(DXN.isDXN('dxn:org.dxos.type.calendar:1.0.0')).toBe(true);
    expect(DXN.isDXN('dxn:com.alice.type.contact:2.1.0')).toBe(true);
    expect(DXN.isDXN('dxn:org.dxos.plugin.markdown')).toBe(true);
    expect(DXN.isDXN('dxn:org.dxos.type.calendarEvent')).toBe(true);
  });

  test('rejects legacy kind-segment DXNs', ({ expect }) => {
    expect(DXN.isDXN('dxn:type:org.dxos.type.calendar')).toBe(false);
    expect(DXN.isDXN('dxn:echo:@:01J00J9B45YHYSGZQTQMSKMGJ6')).toBe(false);
    expect(DXN.isDXN('dxn:queue:data:BA25...:01J00...')).toBe(false);
  });

  test('rejects non-DXN strings', ({ expect }) => {
    expect(DXN.isDXN('echo://space/object')).toBe(false);
    expect(DXN.isDXN('https://example.com')).toBe(false);
    expect(DXN.isDXN('')).toBe(false);
    expect(DXN.isDXN(42)).toBe(false);
  });
});

describe('DXN.fromTypename', () => {
  test('produces unversioned DXN', ({ expect }) => {
    expect(DXN.fromTypename('org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
  });
});

describe('DXN.fromTypenameAndVersion', () => {
  test('produces versioned DXN', ({ expect }) => {
    expect(DXN.fromTypenameAndVersion('org.dxos.type.calendar', '1.0.0')).toBe(
      'dxn:org.dxos.type.calendar:1.0.0',
    );
  });
});

describe('DXN.parse', () => {
  test('passes through new format unchanged', ({ expect }) => {
    expect(DXN.parse('dxn:org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
    expect(DXN.parse('dxn:org.dxos.type.calendar:1.0.0')).toBe('dxn:org.dxos.type.calendar:1.0.0');
  });

  test('normalizes legacy dxn:type:<nsid> to dxn:<nsid>', ({ expect }) => {
    expect(DXN.parse('dxn:type:org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
  });

  test('throws on invalid input', ({ expect }) => {
    expect(() => DXN.parse('not-a-dxn')).toThrow();
    expect(() => DXN.parse('dxn:invalid')).toThrow();
  });
});

describe('DXN.getNsid', () => {
  test('extracts NSID from new-format DXN', ({ expect }) => {
    expect(DXN.getNsid('dxn:org.dxos.type.calendar' as DXN.DXN)).toBe('org.dxos.type.calendar');
    expect(DXN.getNsid('dxn:org.dxos.plugin.markdown' as DXN.DXN)).toBe('org.dxos.plugin.markdown');
  });

  test('extracts NSID from versioned DXN (without version)', ({ expect }) => {
    expect(DXN.getNsid('dxn:org.dxos.type.calendar:1.0.0' as DXN.DXN)).toBe('org.dxos.type.calendar');
  });
});

describe('DXN.getVersion', () => {
  test('returns version from versioned DXN', ({ expect }) => {
    expect(DXN.getVersion('dxn:org.dxos.type.calendar:1.0.0' as DXN.DXN)).toBe('1.0.0');
    expect(DXN.getVersion('dxn:com.alice.type.contact:2.1.0' as DXN.DXN)).toBe('2.1.0');
  });

  test('returns undefined for unversioned DXN', ({ expect }) => {
    expect(DXN.getVersion('dxn:org.dxos.type.calendar' as DXN.DXN)).toBeUndefined();
  });
});

describe('DXN.equals', () => {
  test('returns true for identical DXNs', ({ expect }) => {
    const a = DXN.fromTypename('org.dxos.type.calendar');
    const b = DXN.fromTypename('org.dxos.type.calendar');
    expect(DXN.equals(a, b)).toBe(true);
  });

  test('returns false for different DXNs', ({ expect }) => {
    const a = DXN.fromTypename('org.dxos.type.calendar');
    const b = DXN.fromTypename('org.dxos.type.event');
    expect(DXN.equals(a, b)).toBe(false);
  });
});
