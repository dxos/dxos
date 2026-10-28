//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import { describe, test } from 'vitest';

import * as Plugin from '@dxos/app-framework/Plugin';
import { Trigger } from '@dxos/async';
import { DXN } from '@dxos/echo';
// Resolves to `plugin.node.ts` under the source condition vitest uses.
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import { ClientEvents } from '#types';

await Harness.preload({ plugins: [ClientPlugin.make({})] });

/** Records when a module on each client event activates; its Initialized module holds that wave open until `release`. */
const makeProbePlugin = (activated: string[], release: Trigger) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.probe'), name: 'Probe' })).pipe(
    Plugin.addModule({
      id: 'initialized',
      provides: [],
      activatesOn: ClientEvents.Initialized,
      activate: () =>
        Effect.gen(function* () {
          yield* Effect.promise(() => release.wait());
          activated.push('initialized');
          return [];
        }),
    }),
    Plugin.addModule({
      id: 'spaces-available',
      provides: [],
      activatesOn: ClientEvents.SpacesAvailable,
      activate: () => Effect.sync(() => (activated.push('spaces-available'), [])),
    }),
    Plugin.addModule({
      id: 'services-ready',
      provides: [],
      activatesOn: ClientEvents.ServicesReady,
      activate: () => Effect.sync(() => (activated.push('services-ready'), [])),
    }),
    Plugin.make,
  );

describe('Client module', () => {
  test('fires SpacesAvailable without waiting for the Initialized wave, and ServicesReady after it', async ({
    expect,
  }) => {
    const activated: string[] = [];
    const release = new Trigger();
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), makeProbePlugin(activated, release)()],
    });

    await expect.poll(() => activated, { timeout: 15_000 }).toContain('spaces-available');
    expect(activated).toEqual(['spaces-available']);

    release.wake();
    await expect.poll(() => activated, { timeout: 15_000 }).toContain('services-ready');
    expect(activated).toEqual(['spaces-available', 'initialized', 'services-ready']);
  });
});
