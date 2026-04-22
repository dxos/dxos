//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { createTestApp } from '@dxos/app-framework/testing';
import { MarkdownCapabilities, MarkdownEvents } from '@dxos/plugin-markdown';

import { MermaidPlugin } from './MermaidPlugin';

describe('MermaidPlugin', () => {
  //
  // Module activation tests — one per module in MermaidPlugin.tsx.
  //
  describe('modules', () => {
    test('markdown module contributes extension on MarkdownEvents.SetupExtensions', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [MermaidPlugin()], autoStart: false });
      expect(harness.getAll(MarkdownCapabilities.Extensions)).toHaveLength(0);

      await harness.fire(MarkdownEvents.SetupExtensions);
      expect(harness.getAll(MarkdownCapabilities.Extensions).flat().length).toBeGreaterThan(0);
    });
  });

  //
  // End-to-end plugin tests.
  //
  describe('plugin', () => {
    test('activates and contributes markdown extension capability', async ({ expect }) => {
      await using harness = await createTestApp({ plugins: [MermaidPlugin()], autoStart: false });
      await harness.fire(MarkdownEvents.SetupExtensions);
      expect(harness.getAll(MarkdownCapabilities.Extensions).flat().length).toBeGreaterThan(0);
    });
  });
});
