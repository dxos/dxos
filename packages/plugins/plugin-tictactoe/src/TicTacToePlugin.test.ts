//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';

import { TicTacToePlugin } from './TicTacToePlugin';
import { TicTacToe } from './types';

describe('TicTacToePlugin', () => {
  //
  // Module activation tests — one per module in TicTacToePlugin.tsx.
  //
  describe('modules', () => {
    test('blueprint-definition module contributes on SetupArtifactDefinition', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TicTacToePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupArtifactDefinition);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition).length).toBeGreaterThan(0);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TicTacToePlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('metadata module contributes TicTacToe.Game metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TicTacToePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === TicTacToe.Game.typename)).toBe(true);
    });

    test('schema module contributes TicTacToe.Game on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TicTacToePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(TicTacToe.Game);
    });

    test('surfaces module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TicTacToePlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [TicTacToePlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('modules activate only on their own events — firing SetupSchema does not trigger surfaces', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [TicTacToePlugin()], autoStart: false });
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
      await using harness = await createTestApp({ plugins: [TicTacToePlugin()] });
      const surfaces = harness.getAll(Capabilities.ReactSurface).flat();
      expect(surfaces.length).toBeGreaterThan(0);
    });
  });
});
