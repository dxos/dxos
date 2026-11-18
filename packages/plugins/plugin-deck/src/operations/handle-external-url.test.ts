//
// Copyright 2026 DXOS.org
//

// @vitest-environment happy-dom

import * as Effect from 'effect/Effect';
import { beforeEach, describe, test, vi } from 'vitest';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as LinkAction from '@dxos/app-toolkit/LinkAction';
import * as Operation from '@dxos/compute/Operation';
import { DXN } from '@dxos/echo';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import * as Harness from '@dxos/plugin-testing/Harness';

import * as DeckPlugin from '#meta';
import { DeckCapabilities, DeckOperation } from '#types';

import { DeckNamespace } from '../namespace.ts';

await Harness.preload({ plugins: [DeckPlugin.make()] });

const WORKSPACE_TYPE = 'example.com.type.workspace';
const DOC_TYPE = 'example.com.type.doc';
const WORKSPACE = 'root/ws';
const PRESENT = DXN.make('com.example.linkAction.present');

describe('DeckOperation.HandleExternalUrl', () => {
  beforeEach(() => window.history.replaceState(null, '', '/'));

  test('runs the action a link names on the object it opens, once', async ({ expect }) => {
    const ran: unknown[] = [];
    await using harness = await Harness.createComposerTestApp({
      plugins: [DeckWorkspacePlugin((data) => Effect.sync(() => ran.push(data))), DeckPlugin.make()],
    });
    await harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, {}));
    await harness.runPromise(
      Operation.invoke(LayoutOperation.Set, { subject: [`${WORKSPACE}/deck`], workspace: WORKSPACE }),
    );
    const opened = new URL(window.location.href);

    for (const action of ['com.example.linkAction.present', 'com.example.linkAction.unknown']) {
      const url = new URL(opened);
      url.searchParams.set(LinkAction.PARAM, action);
      window.history.replaceState(null, '', url);
      await harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, {}));
      expect(new URL(window.location.href).searchParams.has(LinkAction.PARAM)).toBe(false);
    }
    expect(ran).toEqual(['deck']);

    await harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, {}));
    expect(ran).toEqual(['deck']);
  });

  test('a link that names an action holds the boot loader until the action has run', async ({ expect }) => {
    const ran: unknown[] = [];
    const opened = await openedUrl();
    opened.searchParams.set(LinkAction.PARAM, 'com.example.linkAction.present');
    window.history.replaceState(null, '', opened);
    const action = heldAction(ran);
    await using harness = await Harness.createComposerTestApp({
      plugins: [DeckWorkspacePlugin(action.run), DeckPlugin.make()],
    });
    const gate = harness
      .getAll(Capabilities.BootGate)
      .find((gate) => gate.id === `${DeckNamespace.key}.bootGate.linkAction`);
    const pending = () => gate !== undefined && harness.registry.get(gate.state).pending;
    await action.entered.promise;
    expect(pending()).toBe(true);

    action.release.resolve();
    await vi.waitFor(() => expect(pending()).toBe(false));
    expect(ran).toEqual(['deck']);
  });

  test('a navigation that starts before the link action has run cancels it', async ({ expect }) => {
    const ran: unknown[] = [];
    const action = heldAction(ran);
    await using harness = await Harness.createComposerTestApp({
      plugins: [DeckWorkspacePlugin(action.run), DeckPlugin.make()],
    });
    await harness.runPromise(
      Operation.invoke(LayoutOperation.Set, { subject: [`${WORKSPACE}/deck`], workspace: WORKSPACE }),
    );
    const opened = new URL(window.location.href);
    const linked = new URL(opened);
    linked.searchParams.set(LinkAction.PARAM, 'com.example.linkAction.present');

    const handled = harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, { url: linked.href }));
    await action.entered.promise;
    await harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, { url: opened.href }));
    action.release.resolve();
    await handled;
    expect(ran).toEqual([]);
  });

  test('a link overtaken while the next link runs its navigation handlers runs no action', async ({ expect }) => {
    const ran: unknown[] = [];
    const holds = new Map(['first', 'second'].map((name) => [name, heldStep()]));
    const hold: AppCapabilities.NavigationHandler = (url) =>
      holds.get(url.searchParams.get('hold') ?? '')?.run ?? Effect.void;
    await using harness = await Harness.createComposerTestApp({
      plugins: [DeckWorkspacePlugin((data) => Effect.sync(() => ran.push(data)), undefined, hold), DeckPlugin.make()],
    });
    await harness.runPromise(
      Operation.invoke(LayoutOperation.Set, { subject: [`${WORKSPACE}/deck`], workspace: WORKSPACE }),
    );
    const linked = new URL(window.location.href);
    linked.searchParams.set(LinkAction.PARAM, 'com.example.linkAction.present');
    linked.searchParams.set('hold', 'first');
    const next = new URL(window.location.href);
    next.searchParams.set('hold', 'second');

    const first = harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, { url: linked.href }));
    await holds.get('first')!.entered.promise;
    const second = harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, { url: next.href }));
    await holds.get('second')!.entered.promise;
    holds.get('first')!.release.resolve();
    await first;
    expect(ran).toEqual([]);

    holds.get('second')!.release.resolve();
    await second;
  });

  test('an in-app navigation while a link runs its navigation handlers keeps its deck and drops the action', async ({ expect }) => {
    const ran: unknown[] = [];
    const held = heldStep();
    const hold: AppCapabilities.NavigationHandler = (url) => (url.searchParams.has('hold') ? held.run : Effect.void);
    await using harness = await Harness.createComposerTestApp({
      plugins: [DeckWorkspacePlugin((data) => Effect.sync(() => ran.push(data)), undefined, hold), DeckPlugin.make()],
    });
    await harness.runPromise(
      Operation.invoke(LayoutOperation.Set, { subject: [`${WORKSPACE}/deck`], workspace: WORKSPACE }),
    );
    const linked = new URL(window.location.href);
    linked.searchParams.set(LinkAction.PARAM, 'com.example.linkAction.present');
    linked.searchParams.set('hold', '1');

    const handled = harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, { url: linked.href }));
    await held.entered.promise;
    await harness.runPromise(Operation.invoke(LayoutOperation.Set, { subject: [], workspace: WORKSPACE }));
    held.release.resolve();
    await handled;
    expect(ran).toEqual([]);
    expect(activePlanks(harness)).toEqual([]);
  });

  test('a link overtaken while it runs its navigation handlers leaves the next link its deck and action', async ({
    expect,
  }) => {
    const ran: unknown[] = [];
    const held = heldStep();
    const action = heldAction(ran);
    const hold: AppCapabilities.NavigationHandler = (url) => (url.searchParams.has('hold') ? held.run : Effect.void);
    await using harness = await Harness.createComposerTestApp({
      plugins: [DeckWorkspacePlugin(action.run, () => true, hold), DeckPlugin.make()],
    });
    const openWithAction = async (doc: string) => {
      await harness.runPromise(
        Operation.invoke(LayoutOperation.Set, { subject: [`${WORKSPACE}/${doc}`], workspace: WORKSPACE }),
      );
      const url = new URL(window.location.href);
      url.searchParams.set(LinkAction.PARAM, 'com.example.linkAction.present');
      return url;
    };
    const overtaken = await openWithAction('other');
    overtaken.searchParams.set('hold', '1');
    const next = await openWithAction('deck');

    const first = harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, { url: overtaken.href }));
    await held.entered.promise;
    const second = harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, { url: next.href }));
    await action.entered.promise;
    held.release.resolve();
    await first;
    action.release.resolve();
    await second;
    expect(ran).toEqual(['deck']);
    expect(activePlanks(harness)).toEqual([`${WORKSPACE}/deck`]);
  });

  test('a link whose URL opens no object runs no action', async ({ expect }) => {
    const ran: unknown[] = [];
    await using harness = await Harness.createComposerTestApp({
      plugins: [
        DeckWorkspacePlugin(
          (data) => Effect.sync(() => ran.push(data)),
          () => true,
        ),
        DeckPlugin.make(),
      ],
    });
    window.history.replaceState(null, '', `/?${LinkAction.PARAM}=com.example.linkAction.present`);
    await harness.runPromise(Operation.invoke(DeckOperation.HandleExternalUrl, {}));
    expect(ran).toEqual([]);
    expect(new URL(window.location.href).searchParams.has(LinkAction.PARAM)).toBe(false);
  });
});

const activePlanks = (harness: Awaited<ReturnType<typeof Harness.createComposerTestApp>>) =>
  harness.get(Capabilities.AtomRegistry).get(harness.get(DeckCapabilities.EphemeralState)).open[WORKSPACE]?.active;

const openedUrl = async () => {
  await using harness = await Harness.createComposerTestApp({
    plugins: [DeckWorkspacePlugin(() => Effect.void), DeckPlugin.make()],
  });
  await harness.runPromise(
    Operation.invoke(LayoutOperation.Set, { subject: [`${WORKSPACE}/deck`], workspace: WORKSPACE }),
  );
  return new URL(window.location.href);
};

/** An effect that signals when it starts, then waits to be released. */
const heldStep = () => {
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const run = Effect.sync(() => entered.resolve()).pipe(Effect.andThen(Effect.promise(() => release.promise)));
  return { entered, release, run };
};

/** An action that signals when it starts, then records its object once released. */
const heldAction = (ran: unknown[]) => {
  const entered = Promise.withResolvers<void>();
  const release = Promise.withResolvers<void>();
  const run: LinkAction.LinkAction['run'] = (data) =>
    Effect.sync(() => entered.resolve()).pipe(
      Effect.andThen(Effect.promise(() => release.promise)),
      Effect.andThen(Effect.sync(() => ran.push(data))),
    );
  return { entered, release, run };
};

const DeckWorkspacePlugin = (
  run: LinkAction.LinkAction['run'],
  appliesTo: LinkAction.LinkAction['appliesTo'] = (data) => data === 'deck',
  navigationHandler?: AppCapabilities.NavigationHandler,
) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.deckWorkspace'), name: 'Deck workspace' })).pipe(
    Plugin.addModule<void>(
      Capability.inlineModule(
        'docs',
        { provides: [AppCapabilities.AppGraphBuilder, AppCapabilities.LinkAction, AppCapabilities.NavigationHandler] },
        Effect.fnUntraced(function* () {
          const workspaces = yield* AppGraphBuilder.createExtension({
            id: 'workspaces',
            match: GraphNodeMatcher.whenRoot,
            connector: () => Effect.succeed([{ id: 'ws', type: WORKSPACE_TYPE, data: null }]),
          });
          const docs = yield* AppGraphBuilder.createExtension({
            id: 'docs',
            url: { key: 'doc', kind: 'item', path: [] },
            match: GraphNodeMatcher.whenNodeType(WORKSPACE_TYPE),
            connector: () =>
              Effect.succeed([
                { id: 'deck', type: DOC_TYPE, data: 'deck' },
                { id: 'other', type: DOC_TYPE, data: 'other' },
              ]),
          });
          return [
            Capability.contribute(AppCapabilities.AppGraphBuilder, [...workspaces, ...docs]),
            Capability.contribute(AppCapabilities.LinkAction, {
              id: PRESENT,
              links: ['public'],
              appliesTo,
              run,
            }),
            ...(navigationHandler ? [Capability.contribute(AppCapabilities.NavigationHandler, navigationHandler)] : []),
          ];
        }),
      ),
    ),
    Plugin.make,
  )();
