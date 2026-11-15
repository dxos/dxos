//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import * as Effect from 'effect/Effect';
import * as Exit from 'effect/Exit';
import * as Atom from 'effect/reactivity/Atom';
import * as Scope from 'effect/Scope';
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
import { DXN } from '@dxos/echo';
import * as EffectEx from '@dxos/effect/EffectEx';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { invariant } from '@dxos/invariant';
import { EntityId, SpaceId } from '@dxos/keys';
import * as Harness from '@dxos/plugin-testing/Harness';

import { DeckCapabilities } from '#types';

import locatorExtension, { type DeckLocation } from './locator-extension.ts';

/** A segment the test plugin's graph binds a URL to, as a plugin binds its own section. */
const BOUND_SEGMENT = 'bound';

type Call = { op: string; input: { subject?: unknown; focus?: unknown } };

describe('LocatorExtension', () => {
  test('its value in a space holds its front there and its open companions', async ({ expect }) => {
    const { registry, state, locator } = await setup({ flat: false });
    const [spaceA, spaceB] = [SpaceId.random(), SpaceId.random()];
    const a = GraphPath.getSpacePath(spaceA, BOUND_SEGMENT, EntityId.random());
    const b = GraphPath.getSpacePath(spaceB, BOUND_SEGMENT, EntityId.random());
    registry.update(state, (deck) => ({
      ...deck,
      active: [a, b],
      front: a,
      companions: { items: [a, b], variant: 'comments' },
    }));

    expect(registry.get(locator.location)).toEqual({
      [spaceA]: { front: a, companions: [a], variant: 'comments' },
      [spaceB]: { companions: [b], variant: 'comments' },
    });
  });

  test('a flat deck opens what the leader attends without taking focus', async ({ expect }) => {
    const { calls, follow, spaceId } = await setup();
    const path = objectPath(spaceId);
    await follow(view(spaceId, path));

    await expect.poll(() => calls.find(({ op }) => op === 'open')).toBeDefined();
    expect(calls.find(({ op }) => op === 'open')?.input).toMatchObject({ subject: [path], focus: false });
  });

  test('mirroring the leader’s deck does not take focus', async ({ expect }) => {
    const { calls, follow, spaceId } = await setup({ flat: false });
    const path = boundPath(spaceId);
    await follow(view(spaceId, path));

    await expect.poll(() => calls.find(({ op }) => op === 'set')).toBeDefined();
    expect(calls.find(({ op }) => op === 'set')?.input).toMatchObject({ subject: [path], focus: false });
  });

  test('an object that is not yet available is opened once it is', async ({ expect }) => {
    const { calls, follow, registry, spaceId } = await setup();
    const path = objectPath(spaceId);
    const { viewAtom, showing } = await follow(view(spaceId, path, { available: false }));
    await expect.poll(() => registry.get(showing)).toBe(false);

    registry.set(viewAtom, view(spaceId, path));
    await expect.poll(() => calls.find(({ op }) => op === 'open')?.input.subject).toEqual([path]);
    await expect.poll(() => registry.get(showing)).toBe(true);
  });

  test('a failed open is tried again on the next update', async ({ expect }) => {
    const { calls, follow, registry, spaceId } = await setup({ failOpens: 1 });
    const { showing } = await follow(view(spaceId, objectPath(spaceId)));

    await expect.poll(() => calls.filter(({ op }) => op === 'open').length).toBe(2);
    await expect.poll(() => registry.get(showing)).toBe(true);
  });

  test('an open that keeps failing is retried at the update rate, not in a loop', async ({ expect }) => {
    const { calls, follow, registry, spaceId } = await setup({ failOpens: 1_000 });
    const { showing } = await follow(view(spaceId, objectPath(spaceId)));

    await waitTicks(1_200);
    expect(registry.get(showing)).toBe(false);
    expect(calls.filter(({ op }) => op === 'open').length).toBeLessThanOrEqual(5);
  });

  test('a flat deck brings the leader’s object forward when it is open behind another', async ({ expect }) => {
    const { follow, registry, spaceId, state } = await setup();
    const path = objectPath(spaceId);
    const other = objectPath(spaceId);
    registry.update(state, (deck) => ({ ...deck, active: [path, other], front: other }));
    await follow(view(spaceId, path));

    await expect.poll(() => registry.get(state).front).toBe(path);
  });

  test('a leader path this deck has no binding for opens the object at its own path', async ({ expect }) => {
    const { calls, follow, spaceId } = await setup();
    const id = EntityId.random();
    const own = GraphPath.getObjectPath(spaceId, 'expando', id);
    await follow(view(spaceId, GraphPath.getSpacePath(spaceId, 'unbound', id), { localPath: own }));

    await expect.poll(() => calls.find(({ op }) => op === 'open')?.input.subject).toEqual([own]);
  });

  test('a leader path this deck has a binding for is opened as it is', async ({ expect }) => {
    const { calls, follow, spaceId } = await setup();
    const id = EntityId.random();
    const bound = GraphPath.getSpacePath(spaceId, BOUND_SEGMENT, id);
    await follow(view(spaceId, bound, { localPath: GraphPath.getObjectPath(spaceId, 'expando', id) }));

    await expect.poll(() => calls.find(({ op }) => op === 'open')?.input.subject).toEqual([bound]);
  });

  test('a deck that lands after a long wait gets the full mounting window', { timeout: 20_000 }, async ({ expect }) => {
    const { calls, follow, registry, spaceId, state } = await setup({ flat: false });
    const [path, next] = [boundPath(spaceId), boundPath(spaceId)];
    const leader = { active: [path, next], value: { front: path, companions: [] } };
    const { viewAtom, showing } = await follow(view(spaceId, path, { ...leader, available: false }));
    await expect.poll(() => registry.get(showing)).toBe(false);
    await waitTicks(5_500);

    registry.set(viewAtom, view(spaceId, path, leader));
    await expect.poll(() => calls.find(({ op }) => op === 'scrollIntoView')).toBeDefined();
    // The deck then measures another front, as a plank that cannot reach the left edge does, so while mounting the
    // scroll to the leader's goes out again.
    registry.update(state, (deck) => ({ ...deck, front: next }));
    await expect
      .poll(() => calls.filter(({ op }) => op === 'scrollIntoView').length, { timeout: 3_000 })
      .toBeGreaterThan(1);
  });

  test(
    'a mirrored plank this deck has no binding for is left out, not retried',
    { timeout: 20_000 },
    async ({ expect }) => {
      const unresolved = new Set<string>();
      const { calls, follow, registry, spaceId } = await setup({ flat: false, unresolved });
      const path = boundPath(spaceId);
      const other = objectPath(spaceId);
      unresolved.add(other);
      const { showing } = await follow(
        view(spaceId, path, { active: [path, other], value: { front: other, companions: [] } }),
      );
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
      expect(registry.get(showing)).toBe(true);
    },
  );

  test('a waiting deck that lacks a bindable plank of the leader’s does not slide', async ({ expect }) => {
    const { calls, follow, registry, spaceId, state } = await setup({ flat: false });
    const late = boundPath(spaceId);
    const held = [boundPath(spaceId), boundPath(spaceId)];
    registry.update(state, (deck) => ({ ...deck, active: held, front: held[0] }));
    const leader = { active: [...held, late], value: { front: late, companions: [] } };
    const { viewAtom, showing } = await follow(view(spaceId, late, { ...leader, available: false }));
    await expect.poll(() => registry.get(showing)).toBe(false);
    await waitTicks(600);
    expect(calls.filter(({ op }) => op === 'scrollIntoView')).toEqual([]);

    registry.set(viewAtom, view(spaceId, late, leader));
    await expect.poll(() => calls.find(({ op }) => op === 'scrollIntoView')?.input.subject).toBe(late);
  });

  test('a deck that holds the leader’s planks slides to a stand-in for their unbindable front', async ({ expect }) => {
    const { calls, follow, registry, spaceId, state } = await setup({ flat: false });
    const held = boundPath(spaceId);
    const unbound = GraphPath.getSpacePath(spaceId, 'unbound', EntityId.random());
    registry.update(state, (deck) => ({ ...deck, active: [held], front: held }));
    // The attended object is never available, yet the deck already shows the leader's planks.
    await follow(
      view(spaceId, boundPath(spaceId), {
        active: [held, unbound],
        value: { front: unbound, companions: [] },
        available: false,
      }),
    );

    await expect.poll(() => calls.find(({ op }) => op === 'scrollIntoView')?.input.subject).toBe(held);
  });

  test('a plank the leader opens slides the deck once, to it', async ({ expect }) => {
    const { calls, follow, registry, spaceId } = await setup({ flat: false });
    const [first, second, third] = [boundPath(spaceId), boundPath(spaceId), boundPath(spaceId)];
    const { viewAtom } = await follow(
      view(spaceId, first, { active: [first, second], value: { front: second, companions: [] } }),
    );
    await expect.poll(() => calls.filter(({ op }) => op === 'scrollIntoView').length).toBe(1);

    registry.set(
      viewAtom,
      view(spaceId, first, { active: [first, second, third], value: { front: third, companions: [] } }),
    );
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
    const { calls, follow, registry, spaceId, state } = await setup({ flat: false });
    const [before, after] = [boundPath(spaceId), boundPath(spaceId)];
    const unbound = GraphPath.getSpacePath(spaceId, 'unbound', EntityId.random());
    registry.update(state, (deck) => ({ ...deck, active: [before, after], front: before }));
    await follow(
      view(spaceId, boundPath(spaceId), {
        active: [before, unbound, after],
        value: { front: unbound, companions: [] },
        available: false,
      }),
    );

    await expect.poll(() => calls.find(({ op }) => op === 'scrollIntoView')?.input.subject).toBe(after);
  });

  test('a deck short only of planks it cannot bind is not set again when the leader moves', async ({ expect }) => {
    const unresolved = new Set<string>();
    const { calls, follow, registry, spaceId } = await setup({ flat: false, unresolved });
    const [first, second] = [boundPath(spaceId), boundPath(spaceId)];
    const unbound = GraphPath.getSpacePath(spaceId, 'unbound', EntityId.random());
    unresolved.add(unbound);
    const leader = { active: [first, second, unbound], value: { front: first, companions: [] } };
    const { viewAtom } = await follow(view(spaceId, first, leader));
    await expect.poll(() => calls.filter(({ op }) => op === 'set').length).toBe(1);

    // The leader attends their other plank: the view changes, but the deck already holds all it can of theirs.
    registry.set(viewAtom, view(spaceId, second, leader));
    await waitTicks(1_000);
    expect(calls.filter(({ op }) => op === 'set')).toHaveLength(1);
  });

  test('a mirrored plank opens the companion the leader has open, in their tab, and closes it with them', async ({
    expect,
  }) => {
    const { calls, follow, registry, spaceId } = await setup({ flat: false });
    const path = boundPath(spaceId);
    const { viewAtom } = await follow(
      view(spaceId, path, { value: { front: path, companions: [path], variant: 'comments' } }),
    );
    await expect
      .poll(() => calls.find(({ op }) => op === 'updateCompanion')?.input)
      .toEqual({ subject: `${path}/~comments`, anchor: path });

    registry.set(viewAtom, view(spaceId, path, { value: { front: path, companions: [] } }));
    await expect
      .poll(() => calls.filter(({ op }) => op === 'updateCompanion').at(-1)?.input)
      .toEqual({ subject: null, anchor: path });
  });
});

/** Lets the module's forked navigation settle. */
const waitTicks = (ms = 200) => new Promise((resolve) => setTimeout(resolve, ms));

const boundPath = (spaceId: SpaceId) => GraphPath.getSpacePath(spaceId, BOUND_SEGMENT, EntityId.random());

const objectPath = (spaceId: SpaceId) => GraphPath.getObjectPath(spaceId, 'expando', EntityId.random());

const keyOf = (path: string) => {
  const key = GraphPath.getEidFromPath(path);
  invariant(key, `No object in ${path}`);
  return key;
};

/** The leader attends `path`, which this session opens at the same path unless told otherwise or unavailable. */
const view = (
  spaceId: SpaceId,
  path: string,
  {
    active = [path],
    value,
    localPath = path,
    available = true,
  }: { active?: string[]; value?: DeckLocation; localPath?: string; available?: boolean } = {},
): AppCapabilities.FollowView => ({
  spaceId,
  active,
  attended: { key: keyOf(path), path, ...(available && { localPath }) },
  ...(value && { value }),
});

type DeckTestState = {
  workspace: string;
  active: string[];
  flat: boolean;
  front?: string;
  companions: { items: string[]; variant?: string };
};

const DeckTestState = Capability.makeSingleton<Atom.Writable<DeckTestState>>()(
  'org.dxos.plugin.deck.test.locatorExtension.state',
);

const setup = async ({
  flat = true,
  failOpens = 0,
  unresolved = new Set<string>(),
}: { flat?: boolean; failOpens?: number; unresolved?: ReadonlySet<string> } = {}) => {
  const calls: Call[] = [];
  const harness = await Harness.createComposerTestApp({ plugins: [makeDeckPlugin(calls, failOpens, unresolved)] });
  onTestFinished(() => harness[Symbol.asyncDispose]());
  const registry = harness.get(Capabilities.AtomRegistry);
  const state = harness.get(DeckTestState);
  const spaceId = SpaceId.random();
  registry.update(state, (deck) => ({ ...deck, workspace: GraphPath.getSpacePath(spaceId), flat }));
  const locator = harness.get(AppCapabilities.LocatorExtension);

  /** Follows `initial` until the test ends. */
  const follow = async (initial: AppCapabilities.FollowView) => {
    const viewAtom = Atom.make(initial);
    const scope = Effect.runSync(Scope.make());
    onTestFinished(() => EffectEx.runPromise(Scope.close(scope, Exit.void)));
    invariant(locator.follow);
    const showing = Effect.runSync(locator.follow(viewAtom).pipe(Scope.provide(scope)));
    return { viewAtom, showing };
  };

  return { calls, registry, state, spaceId, locator, follow };
};

/** The deck's locator over a fake deck that records the layout operations it asks for. */
const makeDeckPlugin = (calls: Call[], failOpens: number, unresolved: ReadonlySet<string>): Plugin.Plugin =>
  Plugin.define(
    Plugin.makeMeta({ key: DXN.make('org.dxos.plugin.deck.test.locatorExtension'), name: 'Deck (test)' }),
  ).pipe(
    Plugin.addModule<void>(
      Capability.inlineModule(
        'deck',
        {
          requires: [Capabilities.AtomRegistry],
          provides: [Capabilities.OperationHandler, AppCapabilities.Layout, DeckCapabilities.View, DeckTestState],
        },
        () =>
          Effect.gen(function* () {
            const registry = yield* Capabilities.AtomRegistry;
            const state = Atom.make<DeckTestState>({
              workspace: 'root',
              active: [],
              flat: true,
              companions: { items: [] },
            }).pipe(Atom.keepAlive);
            const layout = Atom.make((get): AppCapabilities.Layout => ({
              mode: 'solo',
              dialogOpen: false,
              sidebarOpen: false,
              complementarySidebarOpen: false,
              workspace: get(state).workspace,
              active: get(state).active,
              inactive: [],
              scrollIntoView: undefined,
            })).pipe(Atom.keepAlive);
            const view = Atom.make((get): DeckCapabilities.View => ({
              flat: get(state).flat,
              front: get(state).front,
              companions: get(state).companions,
            })).pipe(Atom.keepAlive);
            const record = (op: string, input: Call['input']) => calls.push({ op, input });
            // As the deck does: a flat deck's front is its current plank; a sliding one has none until it measures.
            const show = (active: readonly string[]) =>
              registry.update(state, (deck) => ({
                ...deck,
                active: [...active],
                front: deck.flat ? active.at(-1) : undefined,
              }));
            return [
              Capability.contribute(DeckTestState, state),
              Capability.contribute(AppCapabilities.Layout, layout),
              Capability.contribute(DeckCapabilities.View, view),
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
                      const active = registry.get(state).active;
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
                  Operation.withHandler(LayoutOperation.UpdateCompanion, (input) =>
                    Effect.sync(() => {
                      record('updateCompanion', input);
                      // As the deck does: a subject opens its plank's companion in that tab, null closes it.
                      const { subject, anchor } = input;
                      const [plank, variant] = subject ? subject.split('/~') : [anchor, undefined];
                      registry.update(state, (deck) => {
                        const items = deck.companions.items.filter((item) => item !== plank);
                        return {
                          ...deck,
                          companions: {
                            items: subject && plank ? [...items, plank] : items,
                            ...((variant ?? deck.companions.variant) && {
                              variant: variant ?? deck.companions.variant,
                            }),
                          },
                        };
                      });
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
                        registry.update(state, (deck) =>
                          deck.active.includes(subject) ? { ...deck, front: subject } : deck,
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
        'locator',
        {
          requires: [
            Capabilities.OperationInvoker,
            Capabilities.AtomRegistry,
            AppCapabilities.Layout,
            DeckCapabilities.View,
          ],
          provides: [AppCapabilities.LocatorExtension],
        },
        () => locatorExtension(),
      ),
    ),
    Plugin.make,
  )();
