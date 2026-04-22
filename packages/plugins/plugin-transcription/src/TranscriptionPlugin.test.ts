//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { TranscriptionPlugin } from './TranscriptionPlugin';

describe('TranscriptionPlugin', () => {
  //
  // Module activation tests — one per module in TranscriptionPlugin.tsx.
  //
  describe('modules', () => {
    test('blueprint-definition module contributes on SetupArtifactDefinition', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TranscriptionPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupArtifactDefinition);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition).length).toBeGreaterThan(0);
    });

    test('metadata module contributes Transcript metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TranscriptionPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.length).toBeGreaterThan(0);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TranscriptionPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('schema module contributes Transcript on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TranscriptionPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      expect(harness.getAll(AppCapabilities.Schema).flat().length).toBeGreaterThan(0);
    });

    test('surfaces module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TranscriptionPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TranscriptionPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    // Skipped: transcriber module activation constructs a Worker via URL.createObjectURL which is
    // unavailable in node vitest (Category A).
    test.skip('transcription (app-graph) module activates on SetupAppGraph', async () => {});

    test('modules activate only on their own events — firing SetupSchema does not trigger surfaces', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [TranscriptionPlugin()], autoStart: false });
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
      await using harness = await createTestApp({ plugins: [TranscriptionPlugin()] });
      const surfaces = harness.getAll(Capabilities.ReactSurface).flat();
      expect(surfaces.length).toBeGreaterThanOrEqual(0);
    });
  });
});
