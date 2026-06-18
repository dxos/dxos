//
// Copyright 2026 DXOS.org
//

import { beforeEach, describe, test, vi } from 'vitest';

import { ProcessManagerPlugin } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';

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
  });
});
