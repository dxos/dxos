//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import { Type } from '@dxos/echo';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as IllustratorEvents from '@dxos/plugin-illustrator/IllustratorEvents';
import * as IllustratorPlugin from '@dxos/plugin-illustrator/IllustratorPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';
import { Scene } from '@dxos/scene';

import * as CanvasPlugin from '#meta';
import { Canvas, CanvasCapabilities } from '#types';

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

  // A cold boot reaches its spaces before the host idles, which is where the types would otherwise be registered: the
  // migration then wrote a Layout2D the database did not know, and every legacy drawing stayed unopenable.
  test(
    'the legacy migration starts with the types it writes registered, before the host idles',
    { timeout: 60_000 },
    async ({ expect }) => {
      await using harness = await Harness.createComposerTestApp({
        plugins: [ClientPlugin.make({}), IllustratorPlugin.make(), CanvasPlugin.make()],
        autoStart: false,
        whenIdle: Effect.never,
      });
      await harness.fire(ActivationEvents.Startup);
      const client = harness.get(ClientCapabilities.Client);
      await client.waitUntilInitialized();
      await client.halo.createIdentity();
      await harness.fire(ClientEvents.SpacesAvailable);

      expect(harness.manager.getActive()).toContain(moduleId('legacy-migration'));
      const written = [Canvas.Canvas, Scene.Model2D, Scene.Layout2D, Scene.Scene2D];
      expect(written.filter((type) => !client.graph.registry.getByURI(String(Type.getURI(type))))).toEqual([]);
    },
  );

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
