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

  test('rejects non-DXN strings', ({ expect }) => {
    expect(DXN.isDXN('echo://space/object')).toBe(false);
    expect(DXN.isDXN('https://example.com')).toBe(false);
    expect(DXN.isDXN('')).toBe(false);
    expect(DXN.isDXN(42)).toBe(false);
  });
});

describe('DXN.Name', () => {
  test('accepts valid NSIDs — no type errors', () => {
    // Three-segment minimum (first + middle + final), all camelCase.
    DXN.make('a.b.c');
    // Multi-segment, all camelCase.
    DXN.make('org.dxos.type.calendar');
    // Hyphen is allowed in a MIDDLE segment.
    DXN.make('org.dxos.app-framework.event.startup');
    // Versioned form.
    DXN.make('org.dxos.type.calendar', '1.0.0');
  });

  test('rejects invalid NSIDs — compile-time type errors', () => {
    // Wrapped in a never-called arrow so the invalid calls are type-checked but
    // never executed at runtime. If Name unexpectedly starts accepting any
    // of these, the @ts-expect-error directive itself becomes a build error
    // ("Unused '@ts-expect-error' directive"), causing the CI check to fail.
    void (() => {
      // No dots — single segment.
      // @ts-expect-error
      DXN.make('unknown');
      // Hyphen in the FINAL segment.
      // @ts-expect-error
      DXN.make('com.example.type.registry-entry');
      // Hyphen in the final segment, versioned.
      // @ts-expect-error
      DXN.make('com.example.type.registry-entry', '0.1.0');
      // Common mistake: kebab-case activation event name.
      // @ts-expect-error
      DXN.make('org.dxos.app-framework.event.setup-react-surface');
    });
  });
});

describe('DXN.make', () => {
  test('produces unversioned DXN', ({ expect }) => {
    expect(DXN.make('org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
  });

  test('produces versioned DXN', ({ expect }) => {
    expect(DXN.make('org.dxos.type.calendar', '1.0.0')).toBe('dxn:org.dxos.type.calendar:1.0.0');
  });

  test('throws on invalid NSID at runtime', ({ expect }) => {
    // @ts-expect-error intentionally invalid NSIDs — verifying runtime throws
    expect(() => DXN.make('not-a-valid-nsid')).toThrow();
    // @ts-expect-error
    expect(() => DXN.make('com.example.type.registry-entry')).toThrow();
    // @ts-expect-error
    expect(() => DXN.make('com.example.type.registry-entry', '0.1.0')).toThrow();
  });
});

describe('DXN.tryMake', () => {
  test('parses new-format DXN strings', ({ expect }) => {
    expect(DXN.tryMake('dxn:org.dxos.type.calendar')).toBe('dxn:org.dxos.type.calendar');
    expect(DXN.tryMake('dxn:org.dxos.type.calendar:1.0.0')).toBe('dxn:org.dxos.type.calendar:1.0.0');
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
