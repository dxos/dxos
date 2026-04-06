//
// Copyright 2026 DXOS.org
//

import { describe, expect, test } from 'vitest';

import { meta } from './meta';
import { translations } from './translations';

describe('translations', () => {
  const enUS = translations[0]['en-US'];

  test('has plugin translations', () => {
    const pluginTranslations = enUS[meta.id];
    expect(pluginTranslations).toBeDefined();
    expect(pluginTranslations['plugin.name']).toBe('Daily Summary');
    expect(pluginTranslations['create-trigger.label']).toBeTruthy();
    expect(pluginTranslations['create-trigger.description']).toBeTruthy();
  });
});
