//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Schema from 'effect/Schema';
import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { DXN, Type } from '@dxos/echo';
// Resolves to `plugin.node.ts` under the source condition vitest uses.
import * as ClientPlugin from '@dxos/plugin-client/ClientPlugin';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';

import { ClientCapabilities, ClientEvents } from '#types';

const NOTE_URI = DXN.make('example.com.type.note', '0.1.0');

class Note extends Type.makeObject<Note>(NOTE_URI)(Schema.Struct({ title: Schema.String })) {}

const NotePlugin = Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.note'), name: 'Note' })).pipe(
  Plugin.addModule({
    id: 'schema',
    provides: [AppCapabilities.Schema],
    activate: () => Effect.succeed(Capability.contribute(AppCapabilities.Schema, [Note])),
  }),
  Plugin.make,
);

describe('SchemaDefs', () => {
  test('registers contributed schema before an IdentityCreated consumer runs', async ({ expect }) => {
    const result: { registered?: boolean } = {};
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), NotePlugin(), makeSeedPlugin(result)()],
      // A cold boot creates the identity before the host idles, where `SchemaDefs` would activate.
      autoStart: false,
      whenIdle: Effect.never,
    });
    await harness.fire(ActivationEvents.Startup);

    const client = harness.get(ClientCapabilities.Client);
    await client.waitUntilInitialized();
    expect(harness.manager.getActive()).not.toContain('org.dxos.plugin.client.module.SchemaDefs');

    // What `ClientOperation.CreateIdentity` does, minus its idle-gated handler registration.
    await client.halo.createIdentity();
    await harness.fire(ClientEvents.IdentityCreated);

    expect(result.registered).toBe(true);
    expect(harness.manager.getActive()).toContain('org.dxos.plugin.client.module.SchemaDefs');
  });
});

/** Records what `Database.add` checks, at the point a first-run consumer would write. */
const makeSeedPlugin = (result: { registered?: boolean }) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.seed'), name: 'Seed' })).pipe(
    Plugin.addModule({
      id: 'seed',
      requires: [ClientCapabilities.Client, ClientCapabilities.SchemaRegistered],
      provides: [],
      activatesOn: ClientEvents.IdentityCreated,
      activate: () =>
        Effect.gen(function* () {
          const client = yield* ClientCapabilities.Client;
          result.registered = client.graph.registry.getByURI(NOTE_URI.toString()) !== undefined;
          return [];
        }),
    }),
    Plugin.make,
  );
