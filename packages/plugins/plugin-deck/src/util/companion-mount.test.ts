//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { isDeckCompanionMounted } from './companion-mount.ts';

describe('isDeckCompanionMounted', () => {
  test('always stays mounted whatever is selected', () => {
    expect(isDeckCompanionMounted({ mount: 'always', variant: 'trace', sidebarState: 'collapsed' })).toBe(true);
  });

  test('selected, the default, mounts only the selected companion and keeps it through a collapse', () => {
    expect(isDeckCompanionMounted({ variant: 'search', selectedVariant: 'trace', sidebarState: 'expanded' })).toBe(
      false,
    );
    expect(isDeckCompanionMounted({ variant: 'search', selectedVariant: 'search', sidebarState: 'collapsed' })).toBe(
      true,
    );
  });

  test('open mounts only in an expanded sidebar', () => {
    const base = { mount: 'open', variant: 'spaceObjects', selectedVariant: 'spaceObjects' } as const;
    expect(isDeckCompanionMounted({ ...base, sidebarState: 'expanded' })).toBe(true);
    expect(isDeckCompanionMounted({ ...base, sidebarState: 'collapsed' })).toBe(false);
    expect(isDeckCompanionMounted({ ...base, sidebarState: 'closed' })).toBe(false);
    expect(isDeckCompanionMounted({ ...base, selectedVariant: 'trace', sidebarState: 'expanded' })).toBe(false);
  });
});
