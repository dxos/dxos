//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { ClientCapabilities, ClientEvents } from '@dxos/plugin-client/types';

import { OutlinerPlugin } from './OutlinerPlugin';
import { Journal, Outline } from '#types';

describe('OutlinerPlugin', () => {
  //
  // Module activation tests — one per module in OutlinerPlugin.tsx.
  //
  describe('modules', () => {
    test('app-graph module contributes on SetupAppGraph', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [OutlinerPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupAppGraph);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder).length).toBeGreaterThan(0);
    });

    test('metadata module contributes Journal and Outline metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [OutlinerPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Journal.Journal.typename)).toBe(true);
      expect(metadata.some((entry) => entry.id === Outline.Outline.typename)).toBe(true);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [OutlinerPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('schema module contributes Journal and Outline on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [OutlinerPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Journal.Journal);
      expect(schemas).toContain(Journal.JournalEntry);
      expect(schemas).toContain(Outline.Outline);
    });

    test('surface module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [OutlinerPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [OutlinerPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('migrations module contributes on ClientEvents.SetupMigration', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [OutlinerPlugin()], autoStart: false });
      expect(harness.getAll(ClientCapabilities.Migration)).toHaveLength(0);

      await harness.fire(ClientEvents.SetupMigration);
      expect(harness.getAll(ClientCapabilities.Migration).length).toBeGreaterThan(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes expected capabilities', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [OutlinerPlugin()] });
      const surfaces = harness.getAll(Capabilities.ReactSurface).flat();
      expect(surfaces.length).toBeGreaterThan(0);
    });
  });
});
