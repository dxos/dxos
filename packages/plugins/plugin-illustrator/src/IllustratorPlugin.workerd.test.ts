//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import { activateHeadlessPlugins } from '@dxos/app-toolkit/testing';
import { Dsl } from '@dxos/diagram';
import { Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';

import * as IllustratorPlugin from '#meta';
import { Drawing, DrawingOperation, LegacySketch } from '#types';

describe('IllustratorPlugin in workerd', () => {
  test('activates headless and contributes its skill, operations and types', async ({ expect }) => {
    const { failures, operationKeys, skillKeys, typenames } = await activateHeadlessPlugins([IllustratorPlugin.make()]);
    expect(failures).toEqual([]);
    expect(skillKeys).toContain(Drawing.SKILL_KEY);
    expect(operationKeys).toContain(String(DrawingOperation.Draw.meta.key));
    expect(typenames).toContain(Type.getTypename(Drawing.Drawing));
    expect(typenames).toContain(Type.getTypename(Drawing.Canvas));
  });

  test('lays out a semantic diagram', async ({ expect }) => {
    const { commands, problems } = await EffectEx.runPromise(
      Dsl.compile('node api "API"\nnode db "Database" right-of api\nedge api -> db "reads"'),
    );
    expect(problems).toEqual([]);
    expect(commands.length).toBeGreaterThan(0);
  });

  test('loads the SVG variant without its surfaces', async ({ expect }) => {
    const module = await import('./capabilities/svg-variant.node.ts');
    expect(module.default).toBeDefined();
  });

  test('exports the legacy sketch type', ({ expect }) => {
    expect(Type.getTypename(LegacySketch.Sketch)).toBe('org.dxos.type.sketch');
  });
});
