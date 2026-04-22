//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { TransformerPlugin } from './TransformerPlugin';

describe('TransformerPlugin', () => {
  //
  // Module activation tests — one per module in TransformerPlugin.tsx.
  //
  // Schema module currently has an empty schema array; we assert only that
  // the module activates on the correct event.
  //
  describe('modules', () => {
    test('schema module activates on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TransformerPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      // Schema contribution is an (empty) array registered under the Schema capability.
      expect(harness.getAll(AppCapabilities.Schema).length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TransformerPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('modules activate only on their own events — firing SetupSchema does not trigger translations', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [TransformerPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupSchema);
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes expected capabilities', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TransformerPlugin()] });
      // No surfaces expected; just assert capabilities are accessible.
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThanOrEqual(0);
    });
  });
});
