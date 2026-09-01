//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN, Obj } from '@dxos/echo';
import { EffectEx } from '@dxos/effect';
import { PublicKey } from '@dxos/keys';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { ComplexMap } from '@dxos/util';

import { SpacePlugin } from '#plugin';
import { SpaceCapabilities, SpaceOperation } from '#types';

import type { ObjectFormHandle } from '../util/index.ts';
import { TestObject } from './testing.ts';

/**
 * `OpenObjectForm` returns what the dialog produced, which means the handler has to stay suspended
 * for as long as the dialog is up. These stand in for the dialog: the stub layout below hands the
 * handle straight to one of them rather than rendering anything.
 */
describe('SpaceOperation.OpenObjectForm', () => {
  test('returns the confirmed object', async ({ expect }) => {
    const object = Obj.make(TestObject, { name: 'confirmed' });
    // The draft sequence: confirming closes the dialog, so the unmount's dismissal arrives before
    // the object the create is still building — and must not settle ahead of it.
    const { harness, db } = await setup((handle) => {
      handle.confirm();
      handle.dismiss();
      handle.settle(object);
    });
    await using _harness = harness;

    const result = await harness.runPromise(Operation.invoke(SpaceOperation.OpenObjectForm, { target: db }));
    expect(result?.target).toBe(object);
  });

  test('returns nothing when the dialog is dismissed', async ({ expect }) => {
    const { harness, db } = await setup((handle) => handle.dismiss());
    await using _harness = harness;

    const result = await harness.runPromise(Operation.invoke(SpaceOperation.OpenObjectForm, { target: db }));
    expect(result).toBeUndefined();
  });

  test('a remount takes back the dismissal it interrupted', async ({ expect }) => {
    const object = Obj.make(TestObject, { name: 'retained' });
    // The StrictMode sequence: the development unmount dismisses and the immediate remount retains,
    // both within one task, so the deferred dismissal never reaches the operation.
    const { harness, db } = await setup((handle) => {
      handle.dismiss();
      handle.retain();
      setTimeout(() => handle.settle(object), 10);
    });
    await using _harness = harness;

    const result = await harness.runPromise(Operation.invoke(SpaceOperation.OpenObjectForm, { target: db }));
    expect(result?.target).toBe(object);
  });
});

/** Stands in for the dialog surface: settles the handle the operation passed through the layout. */
const makeStubLayoutPlugin = (onOpen: (handle: ObjectFormHandle) => void): Plugin.Plugin =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.space.test.stubLayout'), name: 'Stub Layout' })).pipe(
    Plugin.addModule<void>(
      Capability.inlineModule(
        'stub-layout',
        { provides: [Capabilities.OperationHandler, SpaceCapabilities.EphemeralState] },
        () =>
          Effect.succeed([
            // Read by the handler to decide whether a new collection is navigated to; normally
            // contributed by the space plugin's `state.ts`, which needs a layout to activate.
            Capability.contribute(SpaceCapabilities.EphemeralState, ephemeralState()),
            Capability.contribute(
              Capabilities.OperationHandler,
              OperationHandlerSet.make(
                Operation.withHandler(
                  LayoutOperation.UpdateDialog,
                  Effect.fnUntraced(function* (input) {
                    const handle = input.props?.handle;
                    if (handle) {
                      onOpen(handle);
                    }
                  }),
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
    awaiting: undefined,
    sdkMigrationRunning: {},
    navigableCollections: false,
    viewersByObject: {},
    viewersByIdentity: new ComplexMap<PublicKey, Set<string>>(PublicKey.hash),
    mergePreview: undefined,
    lastMergeAt: undefined,
  }).pipe(Atom.keepAlive);

const setup = async (onOpen: (handle: ObjectFormHandle) => void) => {
  const harness = await createComposerTestApp({
    plugins: [ClientPlugin.make({ types: [TestObject] }), SpacePlugin({}), makeStubLayoutPlugin(onOpen)],
  });

  const client = harness.get(ClientCapabilities.Client);
  await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesReady);
  const space = await client.spaces.create();
  await space.waitUntilReady();

  return { harness, db: space.db };
};
