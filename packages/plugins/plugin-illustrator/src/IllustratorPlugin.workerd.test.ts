//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Type } from '@dxos/echo';

import * as IllustratorPlugin from '#meta';
import { Drawing, LegacySketch } from '#types';

describe('IllustratorPlugin in workerd', () => {
  // Operations are node-only (`environments: ['node']`); workerd hosts use the plugin for its types.
  test('activates headless and contributes its types', async ({ expect }) => {
    const { failures, typenames } = await activateHeadlessPlugins([IllustratorPlugin.make()]);
    expect(failures).toEqual([]);
    expect(typenames).toContain(Type.getTypename(Drawing.Drawing));
    expect(typenames).toContain(Type.getTypename(Drawing.Canvas));
  });

  test('exports the legacy sketch type', ({ expect }) => {
    expect(Type.getTypename(LegacySketch.Sketch)).toBe('org.dxos.type.sketch');
  });
});
