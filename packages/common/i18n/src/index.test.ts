//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { addResources, changeLanguage, i18n, onLanguageChanged, t } from './index';

describe('i18n', () => {
  test('instance is initialized synchronously', ({ expect }) => {
    expect(i18n.isInitialized).toBe(true);
  });

  test('addResources registers a bundle and t resolves it', ({ expect }) => {
    addResources([{ 'en-US': { greetings: { hello: 'Hello' } } }]);
    expect(t('hello', { ns: 'greetings' })).toBe('Hello');
  });

  test('addResources merges and overwrites existing bundles', ({ expect }) => {
    addResources([{ 'en-US': { greetings: { goodbye: 'Goodbye' } } }]);
    addResources([{ 'en-US': { greetings: { hello: 'Hi' } } }]);
    expect(t('hello', { ns: 'greetings' })).toBe('Hi');
    expect(t('goodbye', { ns: 'greetings' })).toBe('Goodbye');
  });

  test('changeLanguage switches the active bundle and fires onLanguageChanged', async ({ expect }) => {
    addResources([{ 'en-US': { farewells: { bye: 'Bye' } } }, { 'fr-FR': { farewells: { bye: 'Au revoir' } } }]);

    let changedTo: string | undefined;
    const unsubscribe = onLanguageChanged((language) => {
      changedTo = language;
    });

    await changeLanguage('fr-FR');
    expect(t('bye', { ns: 'farewells' })).toBe('Au revoir');
    expect(changedTo).toBe('fr-FR');

    unsubscribe();
    await changeLanguage('en-US');
    expect(t('bye', { ns: 'farewells' })).toBe('Bye');
    // After unsubscribe, the callback is no longer invoked.
    expect(changedTo).toBe('fr-FR');
  });
});
