//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/reactivity/Atom';
import type * as AtomRegistry from 'effect/reactivity/AtomRegistry';
import { describe, onTestFinished, test } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as Operation from '@dxos/compute/Operation';
import * as OperationHandlerSet from '@dxos/compute/OperationHandlerSet';
import { DXN, Obj } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { EID, EntityId, SpaceId } from '@dxos/keys';
import * as AttentionCapabilities from '@dxos/plugin-attention/AttentionCapabilities';
import * as ClientCapabilities from '@dxos/plugin-client/ClientCapabilities';
import * as ClientEvents from '@dxos/plugin-client/ClientEvents';
import { ClientPlugin, initializeIdentity } from '@dxos/plugin-client/testing';
import * as Harness from '@dxos/plugin-testing/Harness';
import { Attention } from '@dxos/react-ui-attention/types';
import { Expando } from '@dxos/schema';

import { SpaceCapabilities, type SpaceSchema } from '#types';

import { applyViewingMessage, getPresenceKeyFromSpace } from '../util/presence.ts';
import follow from './follow.ts';

await Harness.preload({ plugins: [ClientPlugin.make({})] });

const LEADER = 'a'.repeat(64);

/** A segment the test plugin's graph binds a URL to, as a plugin binds its own section. */
const BOUND_SEGMENT = 'bound';

type Call = { op: string; input: { subject?: unknown; focus?: unknown } };

describe('Follow', () => {
  test('a follow stopped while the leader’s object loads opens nothing', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup();
    lead(
      registry,
      ephemeral,
      space.id,
      EID.make({ spaceId: space.id, entityId: object.id }),
      GraphPath.getObjectPathFromObject(object),
    );
    registry.update(ephemeral, (state) => ({ ...state, following: undefined }));

    await waitTicks();
    expect(calls.filter(({ op }) => op !== 'scrollIntoView')).toEqual([]);
  });

  test('opening what the leader attends does not take focus', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);

    await expect.poll(() => calls.find(({ op }) => op === 'open')).toBeDefined();
    expect(calls.find(({ op }) => op === 'open')?.input).toMatchObject({ subject: [path], focus: false });
  });

  test('mirroring the leader’s deck does not take focus', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup({ flat: false });
    const path = GraphPath.getSpacePath(space.id, BOUND_SEGMENT, object.id);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);

    await expect.poll(() => calls.find(({ op }) => op === 'set')).toBeDefined();
    expect(calls.find(({ op }) => op === 'set')?.input).toMatchObject({ subject: [path], focus: false });
  });

  test('a paused follow opens the leader’s object once it arrives', async ({ expect }) => {
    const { calls, ephemeral, registry, space } = await setup();
    const object = Obj.make(Expando.Expando, { name: 'Draft' });
    const path = GraphPath.getObjectPath(space.id, 'expando', object.id);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);

    space.db.add(object);
    await space.db.flush();
    // The leader's path has no binding in this deck, so it opens the object at its own path.
    await expect
      .poll(() => calls.find(({ op }) => op === 'open')?.input.subject)
      .toEqual([GraphPath.getObjectPathFromObject(object)]);
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(false);
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

  test('a follow paused by a failed open opens on the next update', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup({ failOpens: 1 });
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);

    await expect.poll(() => calls.filter(({ op }) => op === 'open').length).toBe(2);
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(false);
  });

  test('a flat deck brings the leader’s object forward when it is open behind another', async ({ expect }) => {
    const { ephemeral, registry, space, object, layout } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    const other = GraphPath.getObjectPath(space.id, 'expando', EntityId.random());
    registry.update(layout, (state) => ({ ...state, active: [path, other], front: other }));
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);

    await expect.poll(() => registry.get(layout).front).toBe(path);
  });

  test('an open that keeps failing is retried at the update rate, not in a loop', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup({ failOpens: 1_000 });
    lead(
      registry,
      ephemeral,
      space.id,
      EID.make({ spaceId: space.id, entityId: object.id }),
      GraphPath.getObjectPathFromObject(object),
    );

    await waitTicks(1_200);
    expect(registry.get(ephemeral).following?.paused).toBe(true);
    expect(calls.filter(({ op }) => op === 'open').length).toBeLessThanOrEqual(5);
  });

  test(
    'a deck that lands after a long pause gets the full mounting window',
    { timeout: 20_000 },
    async ({ expect }) => {
      const { calls, ephemeral, registry, space, layout } = await setup({ flat: false });
      const object = Obj.make(Expando.Expando, { name: 'Late' });
      const path = GraphPath.getSpacePath(space.id, BOUND_SEGMENT, object.id);
      const next = GraphPath.getSpacePath(space.id, BOUND_SEGMENT, EntityId.random());
      lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path, {
        planks: [path, next],
        front: path,
      });
      await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);
      await waitTicks(5_500);

      space.db.add(object);
      await space.db.flush();
      await expect.poll(() => calls.find(({ op }) => op === 'scrollIntoView')).toBeDefined();
      // The deck then measures another front, as a plank that cannot reach the left edge does, so while mounting the
      // scroll to the leader's goes out again.
      registry.update(layout, (state) => ({ ...state, front: next }));
      await expect
        .poll(() => calls.filter(({ op }) => op === 'scrollIntoView').length, { timeout: 3_000 })
        .toBeGreaterThan(1);
    },
  );

  test(
    'a mirrored plank this deck has no binding for is left out, not retried',
    { timeout: 20_000 },
    async ({ expect }) => {
      const unresolved = new Set<string>();
      const { calls, ephemeral, registry, space, object } = await setup({ flat: false, unresolved });
      const path = GraphPath.getSpacePath(space.id, BOUND_SEGMENT, object.id);
      const other = GraphPath.getObjectPath(space.id, 'expando', EntityId.random());
      unresolved.add(other);
      lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path, {
        planks: [path, other],
        front: other,
      });
      await expect.poll(() => calls.find(({ op }) => op === 'set')).toBeDefined();
      // The leader's front plank is the one left out, so the deck slides to a plank of theirs it holds.
      await expect.poll(() => calls.find(({ op }) => op === 'scrollIntoView')?.input.subject).toBe(path);

      // The deck cannot bind it, now or later, so the follow shows the rest without retrying or re-scrolling past the
      // mounting window.
      await waitTicks(6_000);
      const scrolls = calls.filter(({ op }) => op === 'scrollIntoView').length;
      await waitTicks(1_500);
      expect(calls.filter(({ op }) => op === 'set')).toHaveLength(1);
      expect(calls.filter(({ op }) => op === 'scrollIntoView').length).toBe(scrolls);
      expect(registry.get(ephemeral).following?.paused).toBeFalsy();
    },
  );

  test('going back in history ends the follow', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup();
    const path = GraphPath.getObjectPathFromObject(object);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), path);
    await expect.poll(() => calls.find(({ op }) => op === 'open')).toBeDefined();

    window.dispatchEvent(new PopStateEvent('popstate'));
    expect(registry.get(ephemeral).following).toBeUndefined();
  });

  test('a leader path this deck has no binding for opens the object at its own path', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup();
    const unbound = GraphPath.getSpacePath(space.id, 'unbound', object.id);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), unbound);

    await expect
      .poll(() => calls.find(({ op }) => op === 'open')?.input.subject)
      .toEqual([GraphPath.getObjectPathFromObject(object)]);
  });

  test('a leader path this deck has a binding for is opened as it is', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup();
    const bound = GraphPath.getSpacePath(space.id, BOUND_SEGMENT, object.id);
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), bound);

    await expect.poll(() => calls.find(({ op }) => op === 'open')?.input.subject).toEqual([bound]);
  });

  test('a paused deck that lacks a bindable plank of the leader’s does not slide', async ({ expect }) => {
    const { calls, ephemeral, registry, space, layout } = await setup({ flat: false });
    const late = Obj.make(Expando.Expando, { name: 'Late' });
    const lateKey = EID.make({ spaceId: space.id, entityId: late.id });
    const latePath = GraphPath.getSpacePath(space.id, BOUND_SEGMENT, late.id);
    const held = [EntityId.random(), EntityId.random()].map((id) =>
      GraphPath.getSpacePath(space.id, BOUND_SEGMENT, id),
    );
    registry.update(layout, (state) => ({ ...state, active: held, front: held[0] }));
    lead(registry, ephemeral, space.id, lateKey, latePath, { planks: [...held, latePath], front: latePath });
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);
    await waitTicks(600);
    expect(calls.filter(({ op }) => op === 'scrollIntoView')).toEqual([]);

    space.db.add(late);
    await space.db.flush();
    await expect.poll(() => calls.find(({ op }) => op === 'scrollIntoView')?.input.subject).toBe(latePath);
  });

  test('a deck that holds the leader’s planks slides to a stand-in for their unbindable front', async ({ expect }) => {
    const { calls, ephemeral, registry, space, layout } = await setup({ flat: false });
    const late = Obj.make(Expando.Expando, { name: 'Late' });
    const held = GraphPath.getSpacePath(space.id, BOUND_SEGMENT, EntityId.random());
    const unbound = GraphPath.getSpacePath(space.id, 'unbound', EntityId.random());
    registry.update(layout, (state) => ({ ...state, active: [held], front: held }));
    // The attended object never loads, so the follow pauses, yet the deck already shows the leader's planks.
    lead(
      registry,
      ephemeral,
      space.id,
      EID.make({ spaceId: space.id, entityId: late.id }),
      GraphPath.getSpacePath(space.id, BOUND_SEGMENT, late.id),
      { planks: [held, unbound], front: unbound },
    );
    await expect.poll(() => registry.get(ephemeral).following?.paused).toBe(true);
    await expect.poll(() => calls.find(({ op }) => op === 'scrollIntoView')?.input.subject).toBe(held);
  });

  test('a plank the leader opens slides the deck once, to it', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object } = await setup({ flat: false });
    const key = EID.make({ spaceId: space.id, entityId: object.id });
    const [first, second, third] = [object.id, EntityId.random(), EntityId.random()].map((id) =>
      GraphPath.getSpacePath(space.id, BOUND_SEGMENT, id),
    );
    lead(registry, ephemeral, space.id, key, first, { planks: [first, second], front: second });
    await expect.poll(() => calls.filter(({ op }) => op === 'scrollIntoView').length).toBe(1);

    lead(registry, ephemeral, space.id, key, first, { planks: [first, second, third], front: third });
    await expect.poll(() => calls.filter(({ op }) => op === 'set').length).toBe(2);
    await waitTicks(1_200);
    expect(calls.filter(({ op }) => op === 'scrollIntoView').map(({ input }) => input.subject)).toEqual([
      second,
      third,
    ]);
  });

  test('a stand-in for an unbindable front is the first held plank after it, else the last before it', async ({
    expect,
  }) => {
    const { calls, ephemeral, registry, space, layout } = await setup({ flat: false });
    const late = Obj.make(Expando.Expando, { name: 'Late' });
    const [before, after] = [EntityId.random(), EntityId.random()].map((id) =>
      GraphPath.getSpacePath(space.id, BOUND_SEGMENT, id),
    );
    const unbound = GraphPath.getSpacePath(space.id, 'unbound', EntityId.random());
    registry.update(layout, (state) => ({ ...state, active: [before, after], front: before }));
    lead(
      registry,
      ephemeral,
      space.id,
      EID.make({ spaceId: space.id, entityId: late.id }),
      GraphPath.getSpacePath(space.id, BOUND_SEGMENT, late.id),
      { planks: [before, unbound, after], front: unbound },
    );
    await expect.poll(() => calls.find(({ op }) => op === 'scrollIntoView')?.input.subject).toBe(after);
  });

  test('a deck reshaped under an early scroll is scrolled to the leader’s front again', async ({ expect }) => {
    const { calls, ephemeral, registry, space, object, layout } = await setup({ flat: false });
    const [front, other, next] = [object.id, EntityId.random(), EntityId.random()].map((id) =>
      GraphPath.getSpacePath(space.id, BOUND_SEGMENT, id),
    );
    // The deck already holds the leader's front, so the scroll goes out before `Set` puts `next` after it.
    registry.update(layout, (state) => ({ ...state, active: [other, front], front }));
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), front, {
      planks: [front, next],
      front,
    });
    await expect.poll(() => calls.find(({ op }) => op === 'set')).toBeDefined();
    await expect.poll(() => calls.filter(({ input }) => input.subject === front).length).toBeGreaterThan(1);
  });

  test('going back in history while not following writes nothing', async ({ expect }) => {
    const { ephemeral, registry } = await setup();
    let writes = 0;
    const unsubscribe = registry.subscribe(ephemeral, () => writes++);
    window.dispatchEvent(new PopStateEvent('popstate'));
    unsubscribe();
    expect(writes).toBe(0);
  });

  test('a deck short only of planks it cannot bind is not set again when the leader moves', async ({ expect }) => {
    const unresolved = new Set<string>();
    const { calls, ephemeral, registry, space, object } = await setup({ flat: false, unresolved });
    const other = space.db.add(Obj.make(Expando.Expando, { name: 'Other' }));
    await space.db.flush();
    const [first, second] = [object, other].map((obj) => GraphPath.getSpacePath(space.id, BOUND_SEGMENT, obj.id));
    const unbound = GraphPath.getSpacePath(space.id, 'unbound', EntityId.random());
    unresolved.add(unbound);
    const deck = { planks: [first, second, unbound], front: first };
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: object.id }), first, deck);
    await expect.poll(() => calls.filter(({ op }) => op === 'set').length).toBe(1);

    // The leader attends their other plank: the view changes, but the deck already holds all it can of theirs.
    lead(registry, ephemeral, space.id, EID.make({ spaceId: space.id, entityId: other.id }), second, deck);
    await waitTicks(1_000);
    expect(calls.filter(({ op }) => op === 'set')).toHaveLength(1);
  });

  test('a leader on the space’s Home is followed there, not paused', async ({ expect }) => {
    const { calls, ephemeral, registry, space } = await setup();
    lead(registry, ephemeral, space.id, getPresenceKeyFromSpace(space.id), GraphPath.getSpaceHomePath(space.id));

    await expect.poll(() => calls.find(({ op }) => op === 'open')).toBeDefined();
    expect(calls.find(({ op }) => op === 'open')?.input.subject).toEqual([GraphPath.getSpaceHomePath(space.id)]);
    expect(registry.get(ephemeral).following?.paused).toBeFalsy();
  });
});

/** Lets the module's forked navigation settle. */
const waitTicks = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

/** Starts following `LEADER`, who attends `key` at `path` in a flat deck. */
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
      { identityKey: LEADER, added: [key], removed: [], attended: [key], locations: {}, deck },
      Date.now(),
    ),
    peerDecks: { [spaceId]: { [LEADER]: { [LEADER]: deck } } },
    following: { spaceId, identityKey: LEADER },
  }));

const setup = async ({
  flat = true,
  failOpens = 0,
  unresolved = new Set<string>(),
}: { flat?: boolean; failOpens?: number; unresolved?: ReadonlySet<string> } = {}) => {
  const calls: Call[] = [];
  const harness = await Harness.createComposerTestApp({
    plugins: [ClientPlugin.make({}), makeFollowPlugin(calls, failOpens, unresolved)],
  });
  const client = harness.get(ClientCapabilities.Client);
  await EffectEx.runAndForwardErrors(initializeIdentity(client));
  await harness.waitForEvent(ClientEvents.SpacesAvailable);
  await client.addTypes([Expando.Expando]);
  const space = await client.spaces.create();
  await space.waitUntilReady();
  const object = space.db.add(Obj.make(Expando.Expando, { name: 'Plan' }));
  await space.db.flush();

  const registry = harness.get(Capabilities.AtomRegistry);
  const ephemeral = harness.get(SpaceCapabilities.EphemeralState);
  registry.update(harness.get(LayoutState), (layout) => ({
    ...layout,
    workspace: GraphPath.getSpacePath(space.id),
    flat,
  }));
  onTestFinished(() => harness[Symbol.asyncDispose]());
  return {
    calls,
    registry,
    ephemeral,
    space,
    object,
    attention: harness.get(AttentionCapabilities.Attention),
    layout: harness.get(LayoutState),
  };
};

const LayoutState = Capability.makeSingleton<Atom.Writable<AppCapabilities.Layout>>()(
  'org.dxos.plugin.space.test.follow.layoutState',
);

/** The follow module over a flat layout that records the layout operations it asks for. */
const makeFollowPlugin = (calls: Call[], failOpens: number, unresolved: ReadonlySet<string>): Plugin.Plugin =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.space.test.follow'), name: 'Follow (test)' })).pipe(
    Plugin.addModule<void>(
      Capability.inlineModule(
        'layout',
        {
          requires: [Capabilities.AtomRegistry],
          provides: [
            Capabilities.OperationHandler,
            AppCapabilities.Layout,
            SpaceCapabilities.EphemeralState,
            LayoutState,
          ],
        },
        () =>
          Effect.gen(function* () {
            const registry = yield* Capabilities.AtomRegistry;
            const layout: Atom.Writable<AppCapabilities.Layout> = Atom.make<AppCapabilities.Layout>({
              mode: 'solo',
              dialogOpen: false,
              sidebarOpen: false,
              complementarySidebarOpen: false,
              workspace: 'root',
              active: [],
              inactive: [],
              scrollIntoView: undefined,
              flat: true,
            }).pipe(Atom.keepAlive);
            const record = (op: string, input: Call['input']) => calls.push({ op, input });
            // As the deck does: a flat deck's front is its current plank; a sliding one has none until it measures.
            const show = (active: readonly string[]) =>
              registry.update(layout, (state) => ({
                ...state,
                active: [...active],
                front: state.flat ? active.at(-1) : undefined,
              }));
            return [
              Capability.contribute(LayoutState, layout),
              Capability.contribute(AppCapabilities.Layout, layout),
              Capability.contribute(SpaceCapabilities.EphemeralState, ephemeralState()),
              Capability.contribute(
                Capabilities.OperationHandler,
                OperationHandlerSet.make(
                  Operation.withHandler(LayoutOperation.Open, (input) =>
                    Effect.suspend(() => {
                      record('open', input);
                      if (failOpens > 0) {
                        failOpens--;
                        return Effect.die('open failed');
                      }
                      // As the deck's own Open navigates: subjects it already holds stay where they are.
                      const active = registry.get(layout).active;
                      show(input.subject.every((id) => active.includes(id)) ? active : input.subject);
                      return Effect.succeed(input.subject);
                    }),
                  ),
                  Operation.withHandler(LayoutOperation.Set, (input) =>
                    Effect.sync(() => {
                      record('set', input);
                      // As the deck's navigation does, a plank no URL binding represents is left out.
                      show(input.subject.filter((id) => !unresolved.has(id)));
                    }),
                  ),
                  Operation.withHandler(LayoutOperation.SwitchWorkspace, (input) =>
                    Effect.sync(() => void record('switchWorkspace', input)),
                  ),
                  Operation.withHandler(LayoutOperation.ScrollIntoView, (input) =>
                    Effect.sync(() => {
                      record('scrollIntoView', input);
                      // The deck measures the plank it scrolled to as its front.
                      const subject = input.subject;
                      if (subject !== undefined) {
                        registry.update(layout, (state) =>
                          state.active.includes(subject) ? { ...state, front: subject } : state,
                        );
                      }
                    }),
                  ),
                ),
              ),
            ];
          }),
      ),
    ),
    Plugin.addModule<void>(
      Capability.inlineModule('graph', { provides: [AppCapabilities.AppGraphBuilder] }, () =>
        Effect.gen(function* () {
          const bound = yield* AppGraphBuilder.createExtension({
            id: 'bound',
            url: { key: BOUND_SEGMENT, kind: 'item', path: [BOUND_SEGMENT] },
            match: GraphNodeMatcher.whenNodeType('example.com.type.never'),
            connector: () => Effect.succeed([]),
          });
          return Capability.contribute(AppCapabilities.AppGraphBuilder, bound);
        }),
      ),
    ),
    Plugin.addModule<void>(
      Capability.inlineModule(
        'follow',
        {
          requires: [
            Capabilities.OperationInvoker,
            Capabilities.AtomRegistry,
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
    lastMergeAt: undefined,
  }).pipe(Atom.keepAlive);
