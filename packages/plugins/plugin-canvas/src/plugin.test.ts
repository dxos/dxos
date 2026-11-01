//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as CanvasPlugin from '#meta';
import { CanvasCapabilities } from '#types';

await Harness.preload({ plugins: [ClientPlugin.make({}), IllustratorPlugin.make(), CanvasPlugin.make()] });

const moduleId = (name: string) => `${CanvasPlugin.meta.profile.key}.module.${name}`;

describe('CanvasPlugin', () => {
  // The plugin declares `dependsOn` the illustrator, so the harness boots it too: without it nothing
  // here activates at all, which is the point of the declaration.
  test('modules activate on the expected events', { timeout: 60_000 }, async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), IllustratorPlugin.make(), CanvasPlugin.make()],
    });

    expect(harness.manager.getActive()).toEqual(expect.arrayContaining([moduleId('translations')]));
    // The drawing variant is browser-only and waits for the illustrator's start event.
    expect(harness.manager.getActive()).not.toContain(moduleId('drawing-variant'));

    // Idle-gated. Fired explicitly: the harness awaits Startup only, so reading `getActive()`
    // without this races the host's idle trickle and the set differs run to run.
    await harness.fire(ActivationEvents.Idle);
    expect(harness.manager.getActive()).toContain(moduleId('Settings'));
  });

  test(
    'the library offers the three vehicle presets, each a mesh object made on its first pick',
    { timeout: 60_000 },
    async ({ expect }) => {
      await using harness = await Harness.createComposerTestApp({
        plugins: [ClientPlugin.make({}), IllustratorPlugin.make(), CanvasPlugin.make()],
      });
      await harness.fire(IllustratorEvents.Start);
      const items = harness.getAll(CanvasCapabilities.LibraryItem);
      expect(items.map(({ id, label, dim }) => ({ id, label, dim }))).toEqual([
        { id: 'race', label: 'Race car', dim: '3d' },
        { id: 'firetruck', label: 'Fire engine', dim: '3d' },
        { id: 'taxi', label: 'Taxi', dim: '3d' },
      ]);
      const taxi = await items.find((item) => item.id === 'taxi')?.make();
      expect(taxi).toMatchObject({ id: 'taxi', type: 'mesh' });
    },
  );
});
