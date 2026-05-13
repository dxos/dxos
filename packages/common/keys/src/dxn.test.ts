//
// Copyright 2025 DXOS.org
//

import { describe, test } from 'vitest';

import { DXN } from './dxn';

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

describe('DXN.getNsid', () => {
  test('extracts NSID from new-format DXN', ({ expect }) => {
    expect(DXN.getNsid('dxn:org.dxos.type.calendar')).toBe('org.dxos.type.calendar');
    expect(DXN.getNsid('dxn:org.dxos.plugin.markdown')).toBe('org.dxos.plugin.markdown');
  });

  test('extracts NSID from versioned DXN (without version)', ({ expect }) => {
    expect(DXN.getNsid('dxn:org.dxos.type.calendar:1.0.0')).toBe('org.dxos.type.calendar');
  });
});

describe('DXN.getVersion', () => {
  test('returns version from versioned DXN', ({ expect }) => {
    expect(DXN.getVersion('dxn:org.dxos.type.calendar:1.0.0')).toBe('1.0.0');
    expect(DXN.getVersion('dxn:com.alice.type.contact:2.1.0')).toBe('2.1.0');
  });

  test('returns undefined for unversioned DXN', ({ expect }) => {
    expect(DXN.getVersion('dxn:org.dxos.type.calendar')).toBeUndefined();
  });
});

describe('DXN existing API (backward compat)', () => {
  test('parse and toString round-trip', ({ expect }) => {
    const dxn = DXN.parse('dxn:type:org.dxos.type.calendar');
    expect(dxn.kind).toBe('type');
    expect(dxn.parts).toEqual(['org.dxos.type.calendar']);
    expect(dxn.toString()).toBe('dxn:type:org.dxos.type.calendar');
  });

  test('fromTypename', ({ expect }) => {
    const dxn = DXN.fromTypename('org.dxos.type.calendar');
    expect(dxn.toString()).toBe('dxn:type:org.dxos.type.calendar');
  });
});
