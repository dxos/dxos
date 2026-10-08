//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { mx } from './mx.ts';
import { bridgeTv, tv } from './tv.ts';

describe('tv', () => {
  test('resolves standard tailwind conflicts like mx', ({ expect }) => {
    const recipe = tv({ base: 'text-sm', variants: { big: { true: 'text-lg' } } });
    expect(recipe({ big: true })).toBe(mx('text-sm', 'text-lg'));
    expect(recipe({ big: true })).toContain('text-lg');
    expect(recipe({ big: true })).not.toContain('text-sm');
  });

  test('keeps dxos custom color tokens (text-fg over text-fg-muted)', ({ expect }) => {
    const recipe = tv({ base: 'text-fg-muted', variants: { strong: { true: 'text-fg' } } });
    expect(recipe({ strong: true })).toBe(mx('text-fg-muted', 'text-fg'));
    expect(recipe({ strong: true })).toContain('text-fg');
  });
});

describe('bridgeTv', () => {
  test('adapts a slots recipe into Theme<P> functions with overrides', ({ expect }) => {
    const recipe = tv({
      slots: { root: 'p-1', label: 'text-sm' },
      variants: { variant: { settings: { root: 'p-4', label: 'text-lg' } } },
    });
    const theme = bridgeTv(recipe, ['root', 'label']);
    expect(typeof theme.root).toBe('function');
    expect(theme.root({ variant: 'settings' })).toContain('p-4');
    // consumer override wins via per-slot merge.
    expect(theme.label({ variant: 'settings' }, 'text-xl')).toContain('text-xl');
    expect(theme.label({ variant: 'settings' }, 'text-xl')).not.toContain('text-lg');
  });
});
