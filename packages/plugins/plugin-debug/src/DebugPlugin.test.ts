//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { DebugPlugin } from './DebugPlugin';

const stubOptions = () => ({ logBuffer: {} as any });

describe('DebugPlugin', () => {
  //
  // Module activation tests — one per module in DebugPlugin.tsx.
  //
  describe('modules', () => {
    test('app-graph module contributes on SetupAppGraph', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [DebugPlugin(stubOptions())], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupAppGraph);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder).length).toBeGreaterThan(0);
    });

    // Skipped: react-context pulls in @atlaskit pragmatic-drag-and-drop CSS which cannot
    // parse under vitest node (Category A).
    test.skip('react-context module contributes on Startup', async () => {});

    test('settings module contributes on SetupSettings', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [DebugPlugin(stubOptions())], autoStart: false });
      expect(harness.getAll(AppCapabilities.Settings)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSettings);
      expect(harness.getAll(AppCapabilities.Settings).length).toBeGreaterThan(0);
    });

    // Skipped: surfaces capability pulls in browser-only @atlaskit/devtools chain (Category A).
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [DebugPlugin(stubOptions())], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    // Skipped: Startup also triggers react-context which needs browser-only devtools (Category A).
    test.skip('setup-devtools module activates on Startup', async () => {});
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Skipped: e2e activation pulls in browser-only devtools (Category E).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});
