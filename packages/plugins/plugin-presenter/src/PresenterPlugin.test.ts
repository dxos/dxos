//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { PresenterPlugin } from './PresenterPlugin';

describe('PresenterPlugin', () => {
  //
  // Module activation tests — one per module in PresenterPlugin.tsx.
  //
  describe('modules', () => {
    // Skipped: app-graph module reads getComputedStyle(document.documentElement) at module load
    // (Category A).
    test.skip('app-graph module contributes on SetupAppGraph', async () => {});

    test('settings module contributes on SetupSettings', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [PresenterPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Settings)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSettings);
      expect(harness.getAll(AppCapabilities.Settings).length).toBeGreaterThan(0);
    });

    // Skipped: surfaces module references window at module load (Category A).
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [PresenterPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('modules activate only on their own events — firing SetupSettings does not trigger surfaces', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [PresenterPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupSettings);
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Skipped: e2e activation pulls in browser-only window/getComputedStyle (Category E).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});
