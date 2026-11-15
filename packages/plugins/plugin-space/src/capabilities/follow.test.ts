//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import { describe, onTestFinished, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN, Obj, Ref, Type } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import { EID, EntityId, SpaceId } from '@dxos/keys';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Harness from '@dxos/plugin-testing/Harness';
import { Attention } from '@dxos/react-ui-attention/types';
import { Expando } from '@dxos/schema';
import { Thread } from '@dxos/types';

import { SpaceCapabilities, type SpaceSchema } from '#types';

import { applyViewingMessage, getPresenceKeyFromSpace } from '../util/presence.ts';
import follow from './follow.ts';

await Harness.preload({ plugins: [ClientPlugin.make({})] });

const LEADER = 'a'.repeat(64);

const EXTENSION_ID = 'test-extension';

describe('Follow', () => {
  test('each extension is handed the leader’s view with the leader’s value for it alone', async ({ expect }) => {
    const { followed, ephemeral, registry, space, object } = await setup();
    const key = EID.make({ spaceId: space.id, entityId: object.id });
    const path = GraphPath.getObjectPathFromObject(object);
    const other = GraphPath.getObjectPath(space.id, 'expando', EntityId.random());
    lead(registry, ephemeral, space.id, key, path, {
      planks: [path, other],
      extensions: { [EXTENSION_ID]: { front: other }, 'other-extension': { zoom: 2 } },
    });

    await expect.poll(() => followed.views.at(-1)?.attended.localPath).toBe(path);
    expect(followed.views.at(-1)).toEqual({
      spaceId: space.id,
      active: [path, other],
      attended: { key, path, localPath: path },
      value: { front: other },
    });
  });

  test('stopping a follow ends each extension’s follow', async ({ expect }) => {
    const { followed, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    await expect.poll(() => followed.views.length).toBeGreaterThan(0);

    registry.update(ephemeral, (state) => ({ ...state, following: undefined }));
    await expect.poll(() => followed.closed).toBe(true);
  });

  test('with no extension that navigates, the follower opens the attended object without focus', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup({ navigates: false });
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);

    await expect.poll(() => calls.find(({ op }) => op === 'open')?.input).toEqual({ subject: [path], focus: false });
    expect(calls.filter(({ op }) => op === 'open')).toHaveLength(1);
  });

  test('an extension that navigates opens what the leader shows instead', async ({ expect }) => {
    const { calls, followed, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);

    await expect.poll(() => followed.views.at(-1)?.attended.localPath).toBe(path);
    await waitTicks(600);
    expect(calls.filter(({ op }) => op === 'open')).toEqual([]);
  });

  test('the leader’s anchor is revealed in an object once the layout holds it, without moving the caret', async ({
    expect,
  }) => {
    const { calls, layout, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    await waitTicks(600);
    expect(calls.filter(({ op }) => op === 'reveal')).toEqual([]);

    registry.update(layout, (state) => ({ ...state, active: [path] }));
    await expect
      .poll(() => calls.find(({ op }) => op === 'reveal')?.input)
      .toEqual({ subject: path, anchor: 'line-12', follow: true });
  });

  test('a follow pauses until the leader’s object arrives', async ({ expect }) => {
    const { ephemeral, registry, space } = await setup();
    const object = Obj.make(Expando.Expando, { name: 'Draft' });
    const path = GraphPath.getObjectPath(space.id, 'expando', object.id);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);

    space.db.add(object);
    await space.db.flush();
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(false);
  });

  test('an extension that cannot show the view pauses the follow', async ({ expect }) => {
    const { shows, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(false);

    registry.set(shows, false);
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);
  });

  test('a follow in a space this session does not have pauses', async ({ expect }) => {
    const { ephemeral, registry } = await setup();
    const spaceId = SpaceId.random();
    const key = EID.make({ spaceId, entityId: EntityId.random() });
    lead(registry, ephemeral, spaceId, key, GraphPath.getObjectPath(spaceId, 'expando', EntityId.random()));

    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);
    await waitTicks(600);
    expect(registry.get(ephemeral).following?.paused).toBe(true);
  });

  test('attending another object while paused ends the follow', async ({ expect }) => {
    const { ephemeral, registry, space, object, attention } = await setup();
    const missing = EntityId.random();
    lead(
      registry,
      ephemeral,
      space.id,
      EID.make({ spaceId: space.id, entityId: missing }),
      GraphPath.getObjectPath(space.id, 'expando', missing),
    );
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);

    const plank = document.createElement('div');
    plank.setAttribute(Attention.ATTENDABLE_ATTRIBUTE, GraphPath.getObjectPathFromObject(object));
    document.body.append(plank);
    Attention.attendElement(attention, plank);
    expect(registry.get(ephemeral).following).toBeUndefined();
  });

  test('going back in history ends the follow', async ({ expect }) => {
    const { followed, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    await expect.poll(() => followed.views.length).toBeGreaterThan(0);

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(registry.get(ephemeral).following).toBeUndefined();
  });

  test('going back in history while not following writes nothing', async ({ expect }) => {
    const { ephemeral, registry } = await setup();
    let writes = 0;
    // Reading it first builds the state, which would otherwise announce itself on the first read.
    registry.get(ephemeral);
    const unsubscribe = registry.subscribe(ephemeral, () => writes++);
    window.dispatchEvent(new PopStateEvent('popstate'));
    unsubscribe();
    expect(writes).toBe(0);
  });

  test('a leader on the space’s Home is followed there, not paused', async ({ expect }) => {
    const { followed, ephemeral, registry, space } = await setup();
    lead(registry, ephemeral, space.id, getPresenceKeyFromSpace(space.id), GraphPath.getSpaceHomePath(space.id));

    await expect.poll(() => followed.views.at(-1)?.attended.localPath).toBe(GraphPath.getSpaceHomePath(space.id));
    expect(registry.get(ephemeral).following?.paused).toBeFalsy();
  });
});

/** Lets the module's forked work settle. */
const waitTicks = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts following `LEADER`, who attends `key` at `path`, with their top line there at `line-12`. */
const lead = (
  registry: AtomRegistry.AtomRegistry,
  ephemeral: Atom.Writable<SpaceCapabilities.SpaceEphemeralState>,
  spaceId: string,
  key: EID.EID,
  path: string,
  deck: SpaceSchema.PeerDeck = { planks: [path] },
) =>
  registry.update(ephemeral, (state) => ({
    ...state,
    viewersByObject: applyViewingMessage(
      state.viewersByObject,
      LEADER,
      {
        identityKey: LEADER,
        added: [key],
        removed: [],
        attended: [key],
        locations: { [key]: { viewport: 'line-12' } },
        deck,
      },
      Date.now(),
    ),
    peerDecks: { [spaceId]: { [LEADER]: { [LEADER]: deck } } },
    following: { spaceId, identityKey: LEADER },
  }));

/** What the fake extension was handed: every view in order, and whether its follow ended. */
type Followed = { views: AppCapabilities.FollowView[]; closed: boolean };

/** A layout operation or reveal the follow asked for. */
type Call = { op: string; input: unknown };

/** The reveal operation of the test `Locator` for `Expando`. */
const Reveal = Operation.make({
  meta: { key: DXN.make('com.example.operation.reveal'), name: 'Reveal' },
  input: Schema.Struct({
    subject: Schema.String,
    anchor: Schema.String,
    follow: Schema.optional(Schema.Boolean),
    thread: Schema.optional(Ref.Ref(Thread.Thread)),
  }),
  output: Schema.Void,
});

const setup = async ({ navigates = true }: { navigates?: boolean } = {}) => {
  const followed: Followed = { views: [], closed: false };
  const calls: Call[] = [];
  const harness = await Harness.createComposerTestApp({
    plugins: [ClientPlugin.make({}), makeFollowPlugin(followed, calls, navigates)],
  });
  const client = harness.get(ClientCapabilities.Client);
  await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesAvailable);
  await client.addTypes([Expando.Expando]);
  const space = await client.spaces.create();
  await space.waitUntilReady();
  const object = space.db.add(Obj.make(Expando.Expando, { name: 'Plan' }));
  await space.db.flush();
  onTestFinished(() => harness[Symbol.asyncDispose]());
  return {
    followed,
    calls,
    registry: harness.get(Capabilities.AtomRegistry),
    layout: harness.get(TestLayout),
    shows: harness.get(TestShows),
    ephemeral: harness.get(SpaceCapabilities.EphemeralState),
    space,
    object,
    attention: harness.get(AttentionCapabilities.Attention),
  };
};

const TestLayout = Capability.makeSingleton<Atom.Writable<AppCapabilities.Layout>>()(
  'org.dxos.plugin.space.test.follow.layout',
);

/** Whether the fake extension shows the view. */
const TestShows = Capability.makeSingleton<Atom.Writable<boolean>>()('org.dxos.plugin.space.test.follow.shows');

/**
 * The follow module over a layout that records the operations it is asked for, a `Locator` for `Expando`, and an
 * extension that records each view it is handed.
 */
const makeFollowPlugin = (followed: Followed, calls: Call[], navigates: boolean): Plugin.Plugin =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.space.test.follow'), name: 'Follow (test)' })).pipe(
    Plugin.addModule<void>(
      Capability.inlineModule(
        'layout',
        {
          requires: [Capabilities.AtomRegistry],
          provides: [
            AppCapabilities.Layout,
            AppCapabilities.Locator,
            AppCapabilities.LocatorExtension,
            Capabilities.OperationHandler,
            SpaceCapabilities.EphemeralState,
            TestLayout,
            TestShows,
          ],
        },
        () =>
          Effect.gen(function* () {
            const registry = yield* Capabilities.AtomRegistry;
            const layout = Atom.make<AppCapabilities.Layout>({
              mode: 'solo',
              dialogOpen: false,
              sidebarOpen: false,
              complementarySidebarOpen: false,
              workspace: 'root',
              active: [],
              inactive: [],
              scrollIntoView: undefined,
            }).pipe(Atom.keepAlive);
            const shows = Atom.make(true).pipe(Atom.keepAlive);
            const extension: AppCapabilities.LocatorExtension = {
              id: EXTENSION_ID,
              location: Atom.make({}),
              navigates,
              follow: (view) =>
                Effect.gen(function* () {
                  followed.views.push(registry.get(view));
                  const unsubscribe = registry.subscribe(view, (next) => followed.views.push(next));
                  yield* Effect.addFinalizer(() =>
                    Effect.sync(() => {
                      unsubscribe();
                      followed.closed = true;
                    }),
                  );
                  return shows;
                }),
            };
            const record = (op: string) => (input: unknown) => Effect.sync(() => void calls.push({ op, input }));
            return [
              Capability.contribute(AppCapabilities.Layout, layout),
              Capability.contribute(TestLayout, layout),
              Capability.contribute(TestShows, shows),
              Capability.contribute(AppCapabilities.Locator, { id: Type.getTypename(Expando.Expando), reveal: Reveal }),
              Capability.contribute(AppCapabilities.LocatorExtension, extension),
              Capability.contribute(
                Capabilities.OperationHandler,
                OperationHandlerSet.make(
                  Operation.withHandler(LayoutOperation.Open, (input) =>
                    record('open')(input).pipe(Effect.as(input.subject)),
                  ),
                  Operation.withHandler(LayoutOperation.SwitchWorkspace, record('switchWorkspace')),
                  Operation.withHandler(Reveal, record('reveal')),
                ),
              ),
              Capability.contribute(SpaceCapabilities.EphemeralState, ephemeralState()),
            ];
          }),
      ),
    ),
    Plugin.addModule<void>(
      Capability.inlineModule(
        'follow',
        {
          requires: [
            Capabilities.AtomRegistry,
            Capabilities.OperationInvoker,
            AppCapabilities.Layout,
            AttentionCapabilities.Attention,
            SpaceCapabilities.EphemeralState,
            ClientCapabilities.Client,
          ],
          provides: [],
          activatesOn: ClientEvents.SpacesAvailable,
        },
        () => follow(),
      ),
    ),
    Plugin.make,
  )();

const ephemeralState = () =>
  Atom.make<SpaceCapabilities.SpaceEphemeralState>({
    sdkMigrationRunning: {},
    navigableCollections: false,
    viewersByObject: {},
    peerDecks: {},
    mergePreview: undefined,
    following: undefined,
    sessionId: 'local-session',
    followedSpaces: [],
    peerFollowing: {},
    lastMergeAt: undefined,
  }).pipe(Atom.keepAlive);
