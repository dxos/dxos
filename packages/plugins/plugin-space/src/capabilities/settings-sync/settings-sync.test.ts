//
// Copyright 2026 DXOS.org
//

import * as Option from 'effect/Option';
import { describe, test, vi } from 'vitest';

import * as AppAnnotation from '@dxos/app-toolkit/AppAnnotation';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import { Annotation } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as SpacePlugin from '#meta';

await Harness.preload({ plugins: [ClientPlugin.make({}), SpacePlugin.make({})] });

describe('SettingsSync', () => {
  test('binds once an identity arrives after the space list', async ({ expect }) => {
    await using harness = await Harness.createComposerTestApp({
      plugins: [ClientPlugin.make({}), SpacePlugin.make({})],
    });

    const client = harness.get(ClientCapabilities.Client);
    await client.waitUntilInitialized();
    await harness.waitForEvent(ClientEvents.SpacesAvailable);
    expect(client.halo.identity.get()).toBeNull();
    // Contributed before the identity exists, but its actions take no effect until it binds.
    const sync = await harness.waitForCapability(AppCapabilities.SettingsSync);
    expect(harness.registry.get(sync.ready)).toBe(false);

    // An existing profile's identity loads without `CreateIdentity`, so `IdentityCreated` never fires.
    await client.halo.createIdentity();
    const { settingsSpace } = await EffectEx.runPromise(AppSpace.setupIdentitySpaces(client));

    // With `IdentityCreated` never fired, only the binding names the settings object.
    await vi.waitFor(
      () => {
        expect(harness.registry.get(sync.ready)).toBe(true);
        expect(Option.isSome(Annotation.get(settingsSpace.properties, AppAnnotation.AppSettingsAnnotation))).toBe(true);
      },
      { timeout: 10_000, interval: 100 },
    );
  });
});
