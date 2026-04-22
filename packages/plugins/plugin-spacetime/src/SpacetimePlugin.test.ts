//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { SpacetimePlugin } from './SpacetimePlugin';
import { Model, Scene } from './types';

describe('SpacetimePlugin', () => {
  //
  // Module activation tests — one per module in SpacetimePlugin.tsx.
  //
  describe('modules', () => {
    test('metadata module contributes Scene metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SpacetimePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Scene.Scene.typename)).toBe(true);
    });

    test('schema module contributes Scene and Model on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SpacetimePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Scene.Scene);
      expect(schemas).toContain(Model.Object);
    });

    test('settings module contributes on SetupSettings', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SpacetimePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Settings)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSettings);
      expect(harness.getAll(AppCapabilities.Settings).length).toBeGreaterThan(0);
    });

    // Skipped: surfaces module pulls in @atlaskit pragmatic-drag-and-drop CSS that cannot be
    // parsed under vitest node (Category A).
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SpacetimePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Skipped: e2e activation pulls in browser-only surfaces (Category E).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});
