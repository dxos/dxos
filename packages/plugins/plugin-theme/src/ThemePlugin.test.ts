//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { beforeEach, describe, test, vi } from 'vitest';

import { Capabilities, Capability, ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';

import { ThemePlugin } from '#plugin';

import { meta } from './meta';
import { ThemeCapabilities } from './types';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

// jsdom does not implement window.matchMedia — stub it for ThemePlugin's dark-mode detection.
const stubMatchMedia = (matches: boolean) => {
  Object.defineProperty(window, 'matchMedia', {
    writable: true,
    value: vi.fn().mockImplementation((query: string) => ({
      matches,
      media: query,
      onchange: null,
      addListener: vi.fn(),
      removeListener: vi.fn(),
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
      dispatchEvent: vi.fn(),
    })),
  });
};

beforeEach(() => {
  stubMatchMedia(false); // System preference = light by default.
  localStorage.clear();
  document.documentElement.classList.remove('dark');
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

  test('contributes an appearance setting', async ({ expect }) => {
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), ThemePlugin({})],
    });

    // The plugin-local capability resolves to a writable settings atom, defaulting to 'system'.
    const registry = harness.get(Capabilities.AtomRegistry);
    const settingsAtom = harness.get(ThemeCapabilities.Settings);
    expect(registry.get(settingsAtom).appearance).toBe('system');

    // It is also exposed to the generic settings UI keyed by the plugin.
    const allSettings = harness.getAll(AppCapabilities.Settings);
    expect(allSettings.some((entry) => entry.prefix === meta.profile.key)).toBe(true);
  });

  test('appearance override forces dark independent of system preference', async ({ expect }) => {
    // System preference is light (stubMatchMedia(false)).
    await using harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), ThemePlugin({})],
    });
    const registry = harness.get(Capabilities.AtomRegistry);
    const settingsAtom = harness.get(ThemeCapabilities.Settings);

    registry.set(settingsAtom, { appearance: 'dark' });
    await Promise.resolve();
    expect(document.documentElement.classList.contains('dark')).toBe(true);

    registry.set(settingsAtom, { appearance: 'light' });
    await Promise.resolve();
    expect(document.documentElement.classList.contains('dark')).toBe(false);

    registry.set(settingsAtom, { appearance: 'system' });
    await Promise.resolve();
    expect(document.documentElement.classList.contains('dark')).toBe(false); // Follows light system.
  });

  test("appearance 'system' follows the OS preference", async ({ expect }) => {
    stubMatchMedia(true); // System preference = dark.
    await using _harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), ThemePlugin({})],
    });
    // Default appearance is 'system'; with a dark system preference the class is set.
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });

  test('cross-tab storage event re-applies the theme', async ({ expect }) => {
    // System preference is light; another tab writes 'dark'.
    await using _harness = await createTestApp({
      plugins: [ProcessManagerPlugin(), ThemePlugin({})],
    });
    window.dispatchEvent(
      new StorageEvent('storage', {
        key: meta.profile.key,
        newValue: JSON.stringify({ appearance: 'dark' }),
      }),
    );
    expect(document.documentElement.classList.contains('dark')).toBe(true);
  });
});
