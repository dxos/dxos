//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents, Capabilities } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppActivationEvents, AppCapabilities } from '@dxos/app-toolkit';
import { Organization, Person } from '@dxos/types';

import { PreviewPlugin } from './PreviewPlugin';

describe('PreviewPlugin', () => {
  //
  // Module activation tests — one per module in PreviewPlugin.tsx.
  //
  describe('modules', () => {
    test('schema module contributes Person and Organization on SetupSchema', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [PreviewPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Schema)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupSchema);
      const schemas = harness.getAll(AppCapabilities.Schema).flat();
      expect(schemas).toContain(Person.Person);
      expect(schemas).toContain(Organization.Organization);
    });

    // Skipped: surfaces module pulls in @atlaskit pragmatic-drag-and-drop CSS that cannot be
    // parsed under vitest node (Category A).
    test.skip('surfaces module contributes on SetupReactSurface', async () => {});

    test('translations module contributes resources on SetupTranslations', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [PreviewPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);

      await harness.fire(AppActivationEvents.SetupTranslations);
      expect(harness.getAll(AppCapabilities.Translations).flat().length).toBeGreaterThan(0);
    });

    // Skipped: preview-popover module accesses `document` at activation (Category A).
    test.skip('preview-popover module activates on Startup', async () => {});

    test('modules activate only on their own events — firing SetupSchema does not trigger surfaces', async ({
      expect,
    }) => {
      await using harness = await createTestApp({ plugins: [PreviewPlugin()], autoStart: false });
      await harness.fire(AppActivationEvents.SetupSchema);
      expect(harness.getAll(Capabilities.ReactSurface)).toHaveLength(0);
      expect(harness.getAll(AppCapabilities.Translations)).toHaveLength(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    // Skipped: Startup cascade triggers preview-popover (document access) and surfaces modules
    // that are unsupported in node (Category E).
    test.skip('activates and contributes expected capabilities', async () => {});
  });
});
