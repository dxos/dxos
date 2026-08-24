//
// Copyright 2026 DXOS.org
//

import { describe, test } from 'vitest';

import * as Operation from '@dxos/compute/Operation';
import { EffectEx } from '@dxos/effect';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { SpacePlugin } from '#plugin';
import { SpaceEvents, SpaceOperation } from '#types';

const JSON_SCHEMA = {
  $schema: 'http://json-schema.org/draft-07/schema#',
  type: 'object',
  title: 'Project',
  properties: { name: { type: 'string' } },
  required: ['name'],
};

describe('SpaceOperation.AddType in the app', () => {
  // The handler reads `Plugin.Service` with `Effect.serviceOption` instead of declaring it, so
  // nothing in the type system says the app's manager still reaches it — it arrives through the
  // process-manager runtime's ambient context, which only this exercises.
  test('activates TypeAdded, which is what makes a lazy module contribute its callback', async ({ expect }) => {
    const harness = await createComposerTestApp({ plugins: [ClientPlugin.make({}), SpacePlugin({})] });
    await using _harness = harness;

    const client = harness.get(ClientCapabilities.Client);
    await EffectEx.runAndForwardErrors(initializeIdentity(client));
    await harness.waitForEvent(ClientEvents.SpacesReady);
    const space = await client.spaces.create();
    await space.waitUntilReady();

    const { object } = await harness.runPromise(
      Operation.invoke(
        SpaceOperation.AddType,
        { typename: 'com.example.type.project', name: 'Project', jsonSchema: JSON_SCHEMA },
        { spaceId: space.id },
      ),
    );
    expect(object).toBeDefined();

    await harness.waitForEvent(SpaceEvents.TypeAdded, { timeout: 5_000 });
  });
});
