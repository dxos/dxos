//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { beforeEach, describe, test, vi } from 'vitest';

import { Capability, ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';

import { ThemePlugin } from '#plugin';

import { meta } from './meta';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

// jsdom does not implement window.matchMedia — stub it for ThemePlugin's dark-mode detection.
beforeEach(() => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches: false,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
});

describe('ThemePlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    // Use createTestApp directly to avoid a circular dep with plugin-testing.
    // jsdom environment (see vitest.config.ts) required for React + ThemeProvider rendering.
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), ThemePlugin({})],
    });

    // ReactContext activates on Startup; fires SetupTranslations before it activates.
    expect(harness.manager.getActive()).toContain(moduleId('ReactContext'));
    expect(harness.manager.getActive()).toContain(moduleId('Translator'));
  });

  test('Translator capability resolves contributed translations', async ({ expect }) => {
    await using harness = await createTestApp({
      plugins: [
        ProcessManagerPlugin(),
        ThemePlugin({
          resourceExtensions: [{ 'en-US': { 'test-translator': { greeting: 'Hello from test' } } }],
        }),
      ],
    });

    const translator = harness.get(AppCapabilities.Translator);
    expect(translator.t('greeting', { ns: 'test-translator' })).toBe('Hello from test');
  });

  test('TranslatorService Effect layer resolves the translator', async ({ expect }) => {
    await using harness = await createTestApp({
      plugins: [
        ProcessManagerPlugin(),
        ThemePlugin({
          resourceExtensions: [{ 'en-US': { 'test-translator-effect': { greeting: 'Salut' } } }],
        }),
      ],
    });

    const program = Effect.gen(function* () {
      const translator = yield* AppCapabilities.TranslatorService;
      return translator.t('greeting', { ns: 'test-translator-effect' });
    }).pipe(
      Effect.provide(AppCapabilities.translatorLayer),
      Effect.provideService(Capability.Service, harness.capabilities),
    );

    expect(Effect.runSync(program)).toBe('Salut');
  });
});
