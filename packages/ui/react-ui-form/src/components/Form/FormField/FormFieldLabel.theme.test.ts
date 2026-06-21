//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { labelTheme } from './FormFieldLabel.theme';

describe('labelTheme', () => {
  test('default variant adds no chrome to the text', ({ expect }) => {
    const styles = labelTheme({ variant: 'default' });
    expect(styles.text()).toBeFalsy();
  });

  test('settings variant gives the label prominent text', ({ expect }) => {
    const styles = labelTheme({ variant: 'settings' });
    expect(styles.text()).toContain('text-lg');
  });

  test('per-slot override wins', ({ expect }) => {
    const styles = labelTheme({ variant: 'settings' });
    expect(styles.text({ class: 'text-2xl' })).toContain('text-2xl');
    expect(styles.text({ class: 'text-2xl' })).not.toContain('text-lg');
  });
});
