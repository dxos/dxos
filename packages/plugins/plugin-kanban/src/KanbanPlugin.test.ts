//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { KanbanPlugin } from './KanbanPlugin';
import { Kanban } from './types';

describe('KanbanPlugin', () => {
  //
  // Module activation tests — one per module in KanbanPlugin.tsx.
  //
  describe('modules', () => {
    test('blueprint-definition module contributes on SetupArtifactDefinition', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [KanbanPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupArtifactDefinition);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition).length).toBeGreaterThan(0);
    });

    test('metadata module contributes Kanban metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [KanbanPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Type.getTypename(Kanban.Kanban))).toBe(true);
    });

    // Skipped: operation-handler capability pulls in browser-only modules (Category A).
    test.skip('operation-handler modules contribute on SetupOperationHandler', async () => {});

    test('schema module contributes Kanban schema on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [KanbanPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Kanban.Kanban);
    });

    // Skipped: ReactSurface capability pulls in browser-only modules (Category A).
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [KanbanPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('modules activate only on their own events — firing SetupSchema does not trigger others', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [KanbanPlugin()], autoStart: false });
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
    // Skipped: e2e activation requires browser-only surfaces capability (Category E).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});
