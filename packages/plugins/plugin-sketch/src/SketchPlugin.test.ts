//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { SketchPlugin } from './SketchPlugin';
import { Sketch } from './types';

describe('SketchPlugin', () => {
  //
  // Module activation tests — one per module in SketchPlugin.tsx.
  //
  describe('modules', () => {
    test('metadata module contributes Sketch.Sketch metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SketchPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Sketch.Sketch.typename)).toBe(true);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SketchPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('schema module contributes Sketch schemas on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SketchPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Sketch.Sketch);
      expect(schemas).toContain(Sketch.Canvas);
    });

    test('settings module contributes on SetupSettings', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SketchPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Settings)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSettings);
      expect(harness.getAll(AppCapabilities.Settings).length).toBeGreaterThan(0);
    });

    // Skipped: surfaces module pulls in tldraw which requires core-js named exports unavailable
    // under vitest node (Category A).
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [SketchPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    // app-graph-serializer activates on AppActivationEvents.AppGraphReady which is fired
    // by graph/app-graph plugins after full graph construction; exercising it requires a
    // composer harness with those plugins loaded.
    test.skip('app-graph-serializer module (activates on AppGraphReady — requires graph plugin)', () => {});
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Skipped: e2e activation pulls in tldraw-based surfaces (Category E).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});
