//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Sketch } from '@dxos/plugin-sketch/types';

import { ExcalidrawPlugin } from './SketchPlugin';

describe('ExcalidrawPlugin', () => {
  //
  // Module activation tests — one per module in SketchPlugin.tsx.
  //
  describe('modules', () => {
    test('metadata module contributes Sketch metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ExcalidrawPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Sketch.Sketch.typename)).toBe(true);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ExcalidrawPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('schema module contributes Sketch schema on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ExcalidrawPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Sketch.Sketch);
      expect(schemas).toContain(Sketch.Canvas);
    });

    test('settings module contributes on SetupSettings', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ExcalidrawPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Settings)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSettings);
      expect(harness.getAll(AppCapabilities.Settings).length).toBeGreaterThan(0);
    });

    test('surfaces module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ExcalidrawPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ExcalidrawPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('modules activate only on their own events — firing SetupSchema does not trigger others', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [ExcalidrawPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupSchema);
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Settings)).toHaveLength(0);
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes expected capabilities', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ExcalidrawPlugin()] });
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });
  });
});
