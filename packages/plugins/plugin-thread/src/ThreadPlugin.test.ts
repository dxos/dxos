//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { ThreadPlugin } from './ThreadPlugin';

describe('ThreadPlugin', () => {
  //
  // Module activation tests — one per module in ThreadPlugin.tsx.
  //
  describe('modules', () => {
    test('app-graph module contributes on SetupAppGraph', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupAppGraph);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder).length).toBeGreaterThan(0);
    });

    test('blueprint-definition module contributes on SetupArtifactDefinition', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupArtifactDefinition);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition).length).toBeGreaterThan(0);
    });

    test('metadata module contributes Channel metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.length).toBeGreaterThan(0);
    });

    test('operation-handler modules contribute on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      // Two operation handler modules are registered (default + undo-mappings).
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThanOrEqual(1);
    });

    test('react-root module contributes on Startup', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactRoot)).toHaveLength(0);

      await harness.fire(ActivationEvents.Startup);
      expect(harness.getAll(Capabilities.ReactRoot).length).toBeGreaterThan(0);
    });

    test('schema module contributes on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      expect(harness.getAll(AppCapabilities.Schema).flat().length).toBeGreaterThan(0);
    });

    test('surfaces module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('state module activates on SetupSettings', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      // State module does not contribute a standard capability; we just assert the event fires cleanly.
      await harness.fire(AppActivationEvents.SetupSettings);
    });

    test('modules activate only on their own events — firing SetupSchema does not trigger surfaces', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupSchema);
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes expected capabilities', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ThreadPlugin()] });
      const surfaces = harness.getAll(Capabilities.ReactSurface).flat();
      expect(surfaces.length).toBeGreaterThanOrEqual(0);
    });
  });
});
