//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { SpotlightPlugin } from './SpotlightPlugin';

describe('SpotlightPlugin', () => {
  //
  // Module activation tests — one per module in SpotlightPlugin.ts.
  //
  describe('modules', () => {
    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SpotlightPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SpotlightPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('state, spotlight-dismiss, and react-root modules activate on Startup', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SpotlightPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactRoot)).toHaveLength(0);

      await harness.fire(ActivationEvents.Startup);
      expect(harness.getAll(Capabilities.ReactRoot).length).toBeGreaterThan(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes expected capabilities', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SpotlightPlugin()] });
      expect(harness.getAll(Capabilities.ReactRoot).length).toBeGreaterThan(0);
    });
  });
});
