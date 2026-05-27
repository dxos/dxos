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

  test('accepts legacy kind-segment DXNs (prefix check only)', ({ expect }) => {
    // `isDXN` is a cheap prefix check; legacy formats start with `dxn:` and pass.
    // Full grammar validation lives in `tryMake`.
    expect(DXN.isDXN('dxn:type:org.dxos.type.calendar')).toBe(true);
    expect(DXN.isDXN('dxn:echo:@:01J00J9B45YHYSGZQTQMSKMGJ6')).toBe(true);
    expect(DXN.isDXN('dxn:queue:data:BA25...:01J00...')).toBe(true);
  });

  test('rejects non-DXN strings', ({ expect }) => {
    expect(DXN.isDXN('echo://space/object')).toBe(false);
    expect(DXN.isDXN('https://example.com')).toBe(false);
    expect(DXN.isDXN('')).toBe(false);
    expect(DXN.isDXN(42)).toBe(false);
  });
});

describe('DXN.make', () => {
  test('produces unversioned DXN', ({ expect }) => {
    expect(DXN.make('org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
  });

  test('produces versioned DXN', ({ expect }) => {
    expect(DXN.make('org.dxos.type.calendar', '1.0.0')).toBe('dxn:org.dxos.type.calendar:1.0.0');
  });

  test('throws on invalid NSID', ({ expect }) => {
    expect(() => DXN.make('not-a-valid-nsid')).toThrow();
    expect(() => DXN.make('com.example.type.registry-entry')).toThrow();
    expect(() => DXN.make('com.example.type.registry-entry', '0.1.0')).toThrow();
  });
});

describe('DXN.tryMake', () => {
  test('parses new-format DXN strings', ({ expect }) => {
    expect(DXN.tryMake('dxn:org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
    expect(DXN.tryMake('dxn:org.dxos.type.calendar:1.0.0')).toBe('dxn:org.dxos.type.calendar:1.0.0');
  });

  test('normalizes legacy dxn:type:<nsid> to dxn:<nsid>', ({ expect }) => {
    expect(DXN.tryMake('dxn:type:org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
  });

  test('returns undefined on invalid input', ({ expect }) => {
    expect(DXN.tryMake('not-a-dxn')).toBeUndefined();
    expect(DXN.tryMake('dxn:invalid')).toBeUndefined();
  });

  test('rejects hyphens in the last NSID segment (must be camelCase)', ({ expect }) => {
    expect(DXN.tryMake('dxn:com.example.type.registry-entry')).toBeUndefined();
    expect(DXN.tryMake('dxn:com.example.type.registry-entry:0.1.0')).toBeUndefined();
  });

  test('accepts hyphens in middle segments but not the last', ({ expect }) => {
    expect(DXN.tryMake('dxn:org.dxos.relation.plugin-crm.profileOf')).toBe(
      'dxn:org.dxos.relation.plugin-crm.profileOf',
    );
  });
});

describe('DXN.getName', () => {
  test('extracts NSID from new-format DXN', ({ expect }) => {
    expect(DXN.getName(DXN.make('org.dxos.type.calendar'))).toBe('org.dxos.type.calendar');
    expect(DXN.getName(DXN.make('org.dxos.plugin.markdown'))).toBe('org.dxos.plugin.markdown');
  });

  test('extracts NSID from versioned DXN (without version)', ({ expect }) => {
    expect(DXN.getName(DXN.make('org.dxos.type.calendar', '1.0.0'))).toBe('org.dxos.type.calendar');
  });
});

describe('DXN.getVersion', () => {
  test('returns version from versioned DXN', ({ expect }) => {
    expect(DXN.getVersion(DXN.make('org.dxos.type.calendar', '1.0.0'))).toBe('1.0.0');
    expect(DXN.getVersion(DXN.make('com.alice.type.contact', '2.1.0'))).toBe('2.1.0');
  });

  test('returns undefined for unversioned DXN', ({ expect }) => {
    expect(DXN.getVersion(DXN.make('org.dxos.type.calendar'))).toBeUndefined();
  });
});
