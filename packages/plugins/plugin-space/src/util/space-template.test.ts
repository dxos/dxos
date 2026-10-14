//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import type * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';

import { getTemplateIcon } from './space-template.ts';

const template = (icon?: string): AppCapabilities.SpaceTemplate => ({
  id: 'com.example.template',
  label: 'Example',
  icon,
  apply: () => Promise.resolve(),
});

describe('getTemplateIcon', () => {
  test('keeps an icon the picker can also produce', ({ expect }) => {
    expect(getTemplateIcon(template('potted-plant'))).toBe('potted-plant');
  });

  test('drops anything else, so a space is never styled with a blank', ({ expect }) => {
    expect(getTemplateIcon(template('ph--sun--regular'))).toBeUndefined();
    expect(getTemplateIcon(template('not-an-icon'))).toBeUndefined();
    expect(getTemplateIcon(template())).toBeUndefined();
    expect(getTemplateIcon(undefined)).toBeUndefined();
  });
});
