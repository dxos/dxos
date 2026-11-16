//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import * as Schema from 'effect/Schema';
import { describe, onTestFinished, test, vi } from 'vitest';

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
import { Attention, ViewState } from '@dxos/react-ui-attention/types';
import { Expando } from '@dxos/schema';
import { Thread } from '@dxos/types';

import { SpaceCapabilities, type SpaceSchema } from '#types';

import { applyViewingMessage, getPresenceKeyFromSpace } from '../util/presence.ts';
import follow from './follow.ts';

await Harness.preload({ plugins: [ClientPlugin.make({})] });

const LEADER = 'a'.repeat(64);

/** A view's aspect a follower takes from the leader. */
const TabAspect = ViewState.define({
  key: 'com.example.aspect.tab',
  backend: 'memory',
  schema: Schema.Struct({ tab: Schema.String }),
  defaultValue: () => ({ tab: 'overview' }),
  follow: 'write',
});

describe('Follow', () => {
  test.for([
    { input: 'their planks', planks: true, op: 'set' },
    { input: 'the object they attend, with no planks', planks: false, op: 'open' },
  ])('the follower opens $input in the space, without focus', async ({ planks, op }, { expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path, {
      planks: planks ? [path] : [],
    });

    await expect
      .poll(() => calls.find((call) => call.op === op)?.input)
      .toEqual({ subject: [path], workspace: GraphPath.getSpacePath(space.id), focus: false });
    await vi.advanceTimersByTimeAsync(600);
    expect(calls.filter((call) => call.op === 'set' || call.op === 'open')).toHaveLength(1);
  });

  test('the follower takes the leader’s values of a followed aspect into its view state', async ({ expect }) => {
    const { ephemeral, registry, space, object, viewState } = await setup();
    const key = EID.make({ spaceId: space.id, entityId: object.id });
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, key, path, {
      planks: [path],
      viewState: { [TabAspect.key]: { [key]: { tab: 'spec' } } },
    });

    await expect.poll(() => viewState.get(TabAspect, key)).toEqual({ tab: 'spec' });
  });

  test('the follower scrolls to the leader’s front plank and opens their companion once the layout holds it', async ({
    expect,
  }) => {
    const { calls, layout, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    const other = GraphPath.getObjectPath(space.id, 'expando', EntityId.random());
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path, {
      planks: [path, other],
      front: other,
      viewState: {
        [AppCapabilities.Companions.key]: {
          [EID.make({ spaceId: space.id })]: { planks: [other], variant: 'comments' },
        },
      },
    });
    await vi.advanceTimersByTimeAsync(600);
    expect(calls.filter(({ op }) => op === 'scrollIntoView' || op === 'updateCompanion')).toEqual([]);

    registry.update(layout, (state) => ({ ...state, active: [path, other] }));
    await expect
      .poll(() => calls.find(({ op }) => op === 'scrollIntoView')?.input)
      .toEqual({ subject: other, focus: false });
    await expect
      .poll(() => calls.find(({ op }) => op === 'updateCompanion')?.input)
      .toEqual({ subject: `${other}/~comments`, anchor: other });
  });

  test('the leader’s anchor is revealed in an object once the layout holds it, without moving the caret', async ({
    expect,
  }) => {
    const { calls, layout, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    await vi.advanceTimersByTimeAsync(600);
    expect(calls.filter(({ op }) => op === 'reveal')).toEqual([]);

    registry.update(layout, (state) => ({ ...state, active: [path] }));
    await expect
      .poll(() => calls.find(({ op }) => op === 'reveal')?.input)
      .toEqual({ subject: path, anchor: 'line-12', follow: true });
  });

  test('an anchor the view has not confirmed is revealed again after the mount window, and a confirmed one is not', async ({
    expect,
  }) => {
    const { calls, layout, reveals, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    const revealCount = () => calls.filter(({ op }) => op === 'reveal').length;
    registry.set(reveals, false);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    registry.update(layout, (state) => ({ ...state, active: [path] }));
    await vi.advanceTimersByTimeAsync(6_000);
    const unconfirmed = revealCount();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(revealCount()).toBeGreaterThan(unconfirmed);

    registry.set(reveals, true);
    await vi.advanceTimersByTimeAsync(1_000);
    const confirmed = revealCount();
    await vi.advanceTimersByTimeAsync(1_000);
    expect(revealCount()).toBe(confirmed);
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

  test('a follow pauses while the layout cannot open the leader’s planks, and resumes once it can', async ({
    expect,
  }) => {
    const { blocked, ephemeral, registry, space, object } = await setup();
    blocked.value = true;
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);

    blocked.value = false;
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(false);
  });

  test('a follow in a space this session does not have pauses', async ({ expect }) => {
    const { ephemeral, registry } = await setup();
    const spaceId = SpaceId.random();
    const key = EID.make({ spaceId, entityId: EntityId.random() });
    lead(registry, ephemeral, spaceId, key, GraphPath.getObjectPath(spaceId, 'expando', EntityId.random()));

    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);
    await vi.advanceTimersByTimeAsync(600);
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

  test.for<{ input: string; act: (follow: Setup) => void }>([
    {
      input: 'a click in the deck',
      act: ({ main }) => main.dispatchEvent(new Event('pointerdown', { bubbles: true })),
    },
    { input: 'a wheel over the deck', act: ({ main }) => main.dispatchEvent(new Event('wheel', { bubbles: true })) },
    {
      input: 'a key typed in the deck',
      act: ({ main }) => main.dispatchEvent(new KeyboardEvent('keydown', { key: 'a', bubbles: true })),
    },
    {
      input: 'Escape anywhere',
      act: () => document.body.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true })),
    },
    {
      input: 'selecting an object’s navtree row',
      act: ({ main, object }) => {
        const row = main.appendChild(document.createElement('div'));
        row.setAttribute('data-tree-row', '');
        row.setAttribute('data-object-id', GraphPath.getObjectPathFromObject(object));
        row.dispatchEvent(new Event('pointerdown', { bubbles: true }));
      },
    },
    {
      input: 'leaving the space’s workspace',
      act: ({ registry, layout, space }) => {
        registry.update(layout, (state) => ({ ...state, workspace: GraphPath.getSpacePath(space.id) }));
        registry.update(layout, (state) => ({ ...state, workspace: 'root' }));
      },
    },
    { input: 'going back in history', act: () => window.dispatchEvent(new PopStateEvent('popstate')) },
  ])('$input ends the follow', async ({ act }, { expect }) => {
    const follow = await setupFollowing();
    act(follow);
    expect(follow.registry.get(follow.ephemeral).following).toBeUndefined();
  });

  test('a click or Escape in the presence controls in the deck keeps the follow', async ({ expect }) => {
    const { main, registry, ephemeral } = await setupFollowing();
    const presence = main.appendChild(document.createElement('div'));
    presence.setAttribute('data-follow-keep', '');
    presence.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    presence.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true }));
    expect(registry.get(ephemeral).following).toBeDefined();
  });

  test('going back in history while not following writes nothing', async ({ expect }) => {
    const { ephemeral, registry } = await setup();
    const states: SpaceCapabilities.SpaceEphemeralState[] = [];
    const unsubscribe = registry.subscribe(ephemeral, (state) => states.push(state), { immediate: true });
    window.dispatchEvent(new PopStateEvent('popstate'));
    unsubscribe();
    expect(states).toHaveLength(1);
  });

  test('a leader on the space’s Home is followed there, not paused', async ({ expect }) => {
    const { calls, ephemeral, registry, space } = await setup();
    const home = GraphPath.getSpaceHomePath(space.id);
    lead(registry, ephemeral, space.id, getPresenceKeyFromSpace(space.id), home);

    await expect.poll(() => calls.find(({ op }) => op === 'set')?.input).toMatchObject({ subject: [home] });
    expect(registry.get(ephemeral).following?.paused).toBeFalsy();
  });
});

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

type Setup = Awaited<ReturnType<typeof setupFollowing>>;

/** Follows `LEADER` on the space's object, with a deck `main` to send input to. */
const setupFollowing = async () => {
  const context = await setup();
  const path = GraphPath.getObjectPathFromObject(context.object);
  lead(
    context.registry,
    context.ephemeral,
    context.space.id,
    EID.make({ spaceId: context.space.id, entityId: context.object.id }),
    path,
  );
  await vi.waitUntil(() => context.calls.some(({ op }) => op === 'set'));
  const main = document.body.appendChild(document.createElement('main'));
  onTestFinished(() => main.remove());
  return { ...context, main };
};

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
  output: Schema.Boolean,
});

const setup = async () => {
  const calls: Call[] = [];
  // Set while the layout fails to open what it is asked for.
  const blocked = { value: false };
  // The follow's update ticks run on this clock, which keeps pace with real time until a test jumps it.
  vi.useFakeTimers({ toFake: ['setInterval', 'clearInterval', 'Date'], shouldAdvanceTime: true });
  onTestFinished(() => void vi.useRealTimers());
  const harness = await Harness.createComposerTestApp({
    plugins: [ClientPlugin.make({}), makeFollowPlugin(calls, blocked)],
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
    blocked,
    calls,
    registry: harness.get(Capabilities.AtomRegistry),
    layout: harness.get(TestLayout),
    reveals: harness.get(TestReveals),
    ephemeral: harness.get(SpaceCapabilities.EphemeralState),
    space,
    object,
    attention: harness.get(AttentionCapabilities.Attention),
    viewState: harness.get(AttentionCapabilities.ViewState),
  };
};

const TestLayout = Capability.makeSingleton<Atom.Writable<AppCapabilities.Layout>>()(
  'org.dxos.plugin.space.test.follow.layout',
);

/** What the test `Locator`'s reveal answers: whether its view revealed the anchor. */
const TestReveals = Capability.makeSingleton<Atom.Writable<boolean>>()('org.dxos.plugin.space.test.follow.reveals');

/** The follow module over a layout that records the operations it is asked for, and a `Locator` for `Expando`. */
const makeFollowPlugin = (calls: Call[], blocked: { value: boolean }): Plugin.Plugin =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.space.test.follow'), name: 'Follow (test)' })).pipe(
    Plugin.addModule<void>(
      Capability.inlineModule(
        'layout',
        {
          requires: [Capabilities.AtomRegistry],
          provides: [
            AppCapabilities.Layout,
            AppCapabilities.Locator,
            Capabilities.OperationHandler,
            SpaceCapabilities.EphemeralState,
            TestLayout,
            TestReveals,
          ],
        },
        Effect.fnUntraced(function* () {
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
          const reveals = Atom.make(true).pipe(Atom.keepAlive);
          const record = (op: string) => (input: unknown) => Effect.sync(() => void calls.push({ op, input }));
          return [
            Capability.contribute(AppCapabilities.Layout, layout),
            Capability.contribute(TestLayout, layout),
            Capability.contribute(TestReveals, reveals),
            Capability.contribute(AppCapabilities.Locator, { id: Type.getTypename(Expando.Expando), reveal: Reveal }),
            Capability.contribute(
              Capabilities.OperationHandler,
              OperationHandlerSet.make(
                Operation.withHandler(LayoutOperation.Set, (input) =>
                  blocked.value ? Effect.die(new Error('blocked')) : record('set')(input),
                ),
                Operation.withHandler(LayoutOperation.Open, (input) =>
                  record('open')(input).pipe(Effect.as(input.subject)),
                ),
                Operation.withHandler(LayoutOperation.ScrollIntoView, record('scrollIntoView')),
                Operation.withHandler(LayoutOperation.UpdateCompanion, record('updateCompanion')),
                Operation.withHandler(Reveal, (input) =>
                  record('reveal')(input).pipe(Effect.map(() => registry.get(reveals))),
                ),
              ),
            ),
            Capability.contribute(
              SpaceCapabilities.EphemeralState,
              SpaceCapabilities.makeEphemeralState('local-session'),
            ),
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
            AttentionCapabilities.ViewState,
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
