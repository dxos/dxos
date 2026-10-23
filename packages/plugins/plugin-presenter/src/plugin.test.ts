//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Harness from '@dxos/plugin-testing/Harness';

import { meta } from '#meta';
import { PresenterPlugin } from '#plugin';

const moduleId = (name: string) => `${meta.profile.key}.module.${name}`;

describe('PresenterPlugin', () => {
  test('modules activate on the expected events', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [PresenterPlugin()],
    });

    expect(harness.manager.getActive()).toContain(moduleId('AppGraphBuilder'));
  });

  test('registers the Presentation schema and create entry', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [PresenterPlugin()],
    });

    const registered = harness.manager.getModules().map((module) => module.id);
    expect(registered).toContain(moduleId('schema'));
    expect(registered).toContain(moduleId('CreateObject'));
  });

  test('registers no settings module', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [PresenterPlugin()],
    });

    const registered = harness.manager.getModules().map((module) => module.id);
    const own = registered.filter((id) => id.startsWith(moduleId('')));
    expect(own.length).toBeGreaterThan(0);
    expect(own.filter((id) => id.toLowerCase().includes('settings'))).toEqual([]);
  });
});
