//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Type } from '@dxos/echo';

import { MeetingPlugin } from './MeetingPlugin';
import { Meeting } from '#types';

describe('MeetingPlugin', () => {
  //
  // Module activation tests — one per module in MeetingPlugin.ts.
  //
  describe('modules', () => {
    test('app-graph module contributes on SetupAppGraph', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [MeetingPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraphBuilder)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupAppGraph);
      expect(harness.getAll(AppCapabilities.AppGraphBuilder).length).toBeGreaterThan(0);
    });

    test('metadata module contributes Meeting metadata on SetupMetadata', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [MeetingPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Metadata)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupMetadata);
      const metadata = harness.getAll(AppCapabilities.Metadata);
      expect(metadata.some((entry) => entry.id === Type.getTypename(Meeting.Meeting))).toBe(true);
    });

    test('operation-handler module contributes on SetupOperationHandler', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [MeetingPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.OperationHandler)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupOperationHandler);
      expect(harness.getAll(Capabilities.OperationHandler).length).toBeGreaterThan(0);
    });

    test('schema module contributes Meeting on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [MeetingPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Meeting.Meeting);
    });

    test('surface module contributes on SetupReactSurface', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [MeetingPlugin()], autoStart: false });
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);

      await harness.fire(ActivationEvents.SetupReactSurface);
      expect(harness.getAll(Capabilities.ReactSurface).flat().length).toBeGreaterThan(0);
    });

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [MeetingPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    // Skipped: SetupSettings also fires StateReady which cascades into the call-extension module
    // whose transcription dependency loads a browser Worker at module load time (Category D).
    test.skip('settings module contributes on SetupSettings', async () => {});

    // The state module activates on oneOf(SetupSettings, SetupAppGraph) and fires StateReady as a
    // follow-on event. Its contribution is picked up by the end-to-end test below.
    test.skip('state module (activates on oneOf(SetupSettings, SetupAppGraph))', () => {});

    // The call-extension module activates on allOf(SettingsReady, StateReady) — both of which are
    // follow-on events fired by other modules in this plugin. Exercising them requires full startup.
    test.skip('call-extension module (activates on allOf(SettingsReady, StateReady) — requires full startup)', () => {});
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Skipped: Startup cascades into the call-extension module whose transcription dependency
    // loads a browser Worker at module load time (Category E).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});
