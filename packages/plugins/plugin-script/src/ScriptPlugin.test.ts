//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Script } from '@dxos/functions';

import { ScriptPlugin } from './ScriptPlugin';
import { ScriptCapabilities, ScriptEvents, Notebook } from './types';

describe('ScriptPlugin', () => {
  //
  // Module activation tests — one per module in ScriptPlugin.tsx.
  //
  describe('modules', () => {
    test('app-graph module contributes on SetupAppGraph', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ScriptPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupAppGraph);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder).length).toBeGreaterThan(0);
    });

    test('blueprint-definition module contributes on SetupArtifactDefinition', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ScriptPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupArtifactDefinition);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition).length).toBeGreaterThan(0);
    });

    test('metadata module contributes Script and Notebook metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ScriptPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Script.Script.typename)).toBe(true);
      expect(metadata.some((entry) => entry.id === Notebook.Notebook.typename)).toBe(true);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ScriptPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('schema module contributes Script on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ScriptPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Script.Script);
    });

    // Skipped: surfaces module pulls in @atlaskit pragmatic-drag-and-drop CSS which cannot be
    // parsed under vitest node (Category A).
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ScriptPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('settings module contributes on SetupSettings', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ScriptPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Settings)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSettings);
      expect(harness.getAll(AppCapabilities.Settings).length).toBeGreaterThan(0);
    });

    // Skipped: compiler module initializes esbuild with wasmURL which only works in the browser
    // (Category A).
    test.skip('compiler module contributes on SetupCompiler', async () => {});

    test('modules activate only on their own events — firing SetupSchema does not trigger surfaces', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [ScriptPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupSchema);
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);
      expect(harness.getAll(ScriptCapabilities.Compiler)).toHaveLength(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Skipped: e2e activation pulls in browser-only surfaces and compiler modules (Category E).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});
