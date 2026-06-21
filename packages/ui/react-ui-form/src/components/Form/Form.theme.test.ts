//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { formTheme } from './Form.theme';

describe('formTheme', () => {
  test('default variant adds no chrome to the field', ({ expect }) => {
    const styles = formTheme.styles({ variant: 'default' });
    expect(styles.field()).toBeFalsy();
    expect(formTheme.behavior.default.showDescription).toBe(false);
  });

  test('settings variant frames the field and shows the description', ({ expect }) => {
    const styles = formTheme.styles({ variant: 'settings' });
    // Assert stable invariants (bordered, grid-framed, prominent label, right-aligned control),
    // not the specific grid mechanism, so the test survives layout tweaks.
    expect(styles.field()).toContain('border-separator');
    expect(styles.field()).toContain('grid');
    expect(styles.labelText()).toContain('text-lg');
    expect(styles.control()).toContain('justify-end');
    expect(formTheme.behavior.settings.showDescription).toBe(true);
  });

  test('per-slot override wins', ({ expect }) => {
    const styles = formTheme.styles({ variant: 'settings' });
    expect(styles.labelText({ class: 'text-2xl' })).toContain('text-2xl');
    expect(styles.labelText({ class: 'text-2xl' })).not.toContain('text-lg');
  });
});
