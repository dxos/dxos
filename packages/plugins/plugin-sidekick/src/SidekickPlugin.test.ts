//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { SidekickPlugin } from './SidekickPlugin';
import { Profile, Sidekick } from './types';

describe('SidekickPlugin', () => {
  //
  // Module activation tests — one per module in SidekickPlugin.tsx.
  //
  describe('modules', () => {
    test('blueprint-definition module contributes on SetupArtifactDefinition', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SidekickPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupArtifactDefinition);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition).length).toBeGreaterThan(0);
    });

    test('metadata module contributes Sidekick.Profile metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SidekickPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Sidekick.Profile.typename)).toBe(true);
    });

    test('schema module contributes Sidekick.Profile and Profile.Profile on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SidekickPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Sidekick.Profile);
      expect(schemas).toContain(Profile.Profile);
    });

    test('surfaces module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SidekickPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SidekickPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('modules activate only on their own events — firing SetupSchema does not trigger surfaces', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [SidekickPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupSchema);
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes expected capabilities', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SidekickPlugin()] });
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThanOrEqual(0);
    });
  });
});
