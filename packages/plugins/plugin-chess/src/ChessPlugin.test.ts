//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ChessPlugin } from './ChessPlugin';
import { Print } from './operations';
import { Chess } from './types';

describe('ChessPlugin', () => {
  //
  // Module activation tests — one per module in ChessPlugin.tsx.
  //
  // Each test fires only the module's activation event (with autoStart: false)
  // and asserts that the corresponding capability is contributed. These are
  // regression tests: if a module is removed, renamed, or rewired to the wrong
  // event, the matching test will fail.
  //
  describe('modules', () => {
    test('schema module contributes Chess.Game on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Chess.Game);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('metadata module contributes Chess.Game metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Chess.Game.typename)).toBe(true);
    });

    test('blueprint-definition module contributes on SetupArtifactDefinition', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.BlueprintDefinition)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupArtifactDefinition);
      expect(harness.getAll(AppCapabilities.BlueprintDefinition).length).toBeGreaterThan(0);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('surfaces module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('modules activate only on their own events — firing SetupSchema does not trigger surfaces', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });
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
      await using harness = await createTestApp({ plugins: [ChessPlugin()] });
      const surfaces = harness.getAll(Capabilities.ReactSurface).flat();
      expect(surfaces.length).toBeGreaterThan(0);
    });

    test('waitForEvent resolves once the event has been fired', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [ChessPlugin()], autoStart: false });

      // Fire and wait concurrently — waitForEvent resolves regardless of ordering.
      await Promise.all([
        harness.fire(AppActivationEvents.SetupTranslations),
        harness.waitForEvent(AppActivationEvents.SetupTranslations),
      ]);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    test('invokes the Print operation via the invoker capability', async ({ expect }) => {
      await using harness = await createComposerTestApp({ plugins: [ChessPlugin()] });
      const result = await harness.invoke(Print, {});
      // Empty input returns empty ASCII (handler swallows errors for malformed FEN).
      expect(typeof result.ascii).toBe('string');
    });

    test('Print renders a PGN to ASCII board', async ({ expect }) => {
      await using harness = await createComposerTestApp({ plugins: [ChessPlugin()] });
      const { ascii } = await harness.invoke(Print, { pgn: '1. e4 e5' });
      expect(ascii).toContain('a  b  c  d  e  f  g  h');
    });
  });
});
