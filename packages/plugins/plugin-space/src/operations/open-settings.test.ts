//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { ComplexMap } from '@dxos/util';

import { SpacePlugin } from '#plugin';
import { SpaceCapabilities, SpaceOperation } from '#types';

describe('SpaceOperation.OpenSettings', () => {
  test('closes the companion once the settings are open', async ({ expect }) => {
    const calls: { op: string; input: unknown }[] = [];
    await using harness = await createComposerTestApp({
      plugins: [ClientPlugin.make({}), SpacePlugin({}), makeRecordingLayoutPlugin(calls)],
    });

    const client = harness.get(ClientCapabilities.Client);
    await EffectEx.runAndForwardErrors(initializeIdentity(client));
    await harness.waitForEvent(ClientEvents.SpacesAvailable);
    const space = await client.spaces.create();
    await space.waitUntilReady();

    await harness.runPromise(Operation.invoke(SpaceOperation.OpenSettings, { space }));
    expect(calls.map(({ op }) => op)).toEqual(['open', 'updateCompanion']);
    expect(calls.at(-1)?.input).toEqual({ subject: null });
  });
});

/** A layout that records the layout operations the space plugin asks of it, in order. */
const makeRecordingLayoutPlugin = (calls: { op: string; input: unknown }[]): Plugin.Plugin =>
  Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.space.test.recordingLayout'), name: 'Recording Layout' }),
  ).pipe(
    Plugin.addModule<void>(
      Capability.inlineModule(
        'recording-layout',
        { provides: [Capabilities.OperationHandler, SpaceCapabilities.EphemeralState] },
        () =>
          Effect.succeed([
            // Normally contributed by the space plugin's `state.ts`, which needs a layout to activate.
            Capability.contribute(SpaceCapabilities.EphemeralState, ephemeralState()),
            Capability.contribute(
              Capabilities.OperationHandler,
              OperationHandlerSet.make(
                Operation.withHandler(LayoutOperation.Open, (input) =>
                  Effect.sync(() => {
                    calls.push({ op: 'open', input });
                    return input.subject;
                  }),
                ),
                Operation.withHandler(LayoutOperation.UpdateCompanion, (input) =>
                  Effect.sync(() => void calls.push({ op: 'updateCompanion', input })),
                ),
              ),
            ),
          ]),
      ),
    ),
    Plugin.make,
  )();

const ephemeralState = () =>
  Atom.make<SpaceCapabilities.SpaceEphemeralState>({
    sdkMigrationRunning: {},
    navigableCollections: false,
    viewersByObject: {},
    viewersByIdentity: new ComplexMap<PublicKey, Set<string>>(PublicKey.hash),
    mergePreview: undefined,
    lastMergeAt: undefined,
  }).pipe(Atom.keepAlive);
