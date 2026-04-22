//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { ActivationEvents } from '@dxos/app-framework';
import { createTestApp } from '@dxos/app-framework/testing';
import { AppCapabilities } from '@dxos/app-toolkit';

import { GraphPlugin } from './GraphPlugin';

describe('GraphPlugin', () => {
  //
  // Module activation tests — one per module in GraphPlugin.ts.
  //
  describe('modules', () => {
    test('graph module contributes AppGraph on Startup', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [GraphPlugin()], autoStart: false });
      expect(harness.getAll(AppCapabilities.AppGraph)).toHaveLength(0);

      await harness.fire(ActivationEvents.Startup);
      expect(harness.getAll(AppCapabilities.AppGraph).length).toBeGreaterThan(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes AppGraph capability', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [GraphPlugin()] });
      expect(harness.getAll(AppCapabilities.AppGraph).length).toBeGreaterThan(0);
    });
  });
});
