//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test, vi } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import { DXN } from '@dxos/echo';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { hotkeyStore, setHotkeyScope } from '@dxos/react-focus/store';

import { NavTreePlugin } from '#plugin';
import { NavTreeCapabilities } from '#types';

const OBJECT_SEGMENT = 'object';
const OBJECT_TYPE = 'example.com.type.object';

describe('NavTreePlugin', () => {
  test('graph actions register hotkeys scoped to their parent node', async ({ expect }) => {
    const fired: string[] = [];
    const version = Atom.make(1);
    await using harness = await createComposerTestApp({
      plugins: [makeHostPlugin(fired, version)(), NavTreePlugin()],
    });

    const builder = await harness.waitForCapability(AppCapabilities.AppGraph);
    const { graph } = builder;
    const objectId = GraphNode.qualifyId(GraphNode.RootId, OBJECT_SEGMENT);
    AppGraph.expandSync(graph, GraphNode.RootId, 'child');
    await AppGraphBuilder.flush(builder);
    AppGraph.expandSync(graph, objectId, 'action');
    await AppGraphBuilder.flush(builder);

    await expect.poll(() => findBinding('Present')?.scopes, { timeout: 2_000 }).toEqual([objectId]);

    setHotkeyScope(objectId);
    press('P');
    await expect.poll(() => fired).toEqual(['present 1']);
  });

  test('a graph update re-registers only changed bindings, and a kept binding runs the current action', async ({
    expect,
  }) => {
    const fired: string[] = [];
    const version = Atom.make(1);
    await using harness = await createComposerTestApp({
      plugins: [makeHostPlugin(fired, version)(), NavTreePlugin()],
    });

    const builder = await harness.waitForCapability(AppCapabilities.AppGraph);
    const { graph } = builder;
    const objectId = GraphNode.qualifyId(GraphNode.RootId, OBJECT_SEGMENT);
    AppGraph.expandSync(graph, GraphNode.RootId, 'child');
    await AppGraphBuilder.flush(builder);
    AppGraph.expandSync(graph, objectId, 'action');
    await AppGraphBuilder.flush(builder);
    await expect.poll(() => findBinding('Present'), { timeout: 2_000 }).toBeDefined();

    const register = vi.spyOn(hotkeyStore, 'register');
    try {
      harness.registry.set(version, 2);
      await AppGraphBuilder.flush(builder);
      // The new binding shows the sync ran; the unchanged one must not have been re-registered.
      await expect.poll(() => findBinding('Rename'), { timeout: 2_000 }).toBeDefined();
      expect(register.mock.calls.map(([command]) => [command].flat()[0]?.label)).toEqual(['Rename']);
    } finally {
      register.mockRestore();
    }

    setHotkeyScope(objectId);
    press('P');
    await expect.poll(() => fired).toEqual(['present 2']);
  });

  test('expose opens the ancestors of the subject but not the subject itself', async ({ expect }) => {
    await using harness = await createComposerTestApp({
      plugins: [makeHostPlugin([], Atom.make(1))(), NavTreePlugin()],
    });

    const objectId = GraphNode.qualifyId(GraphNode.RootId, OBJECT_SEGMENT);
    await harness.invoke(LayoutOperation.Expose, { subject: objectId });

    const { getItem } = await harness.waitForCapability(NavTreeCapabilities.State);
    expect(getItem([GraphNode.RootId]).open).toBe(true);
    expect(getItem([GraphNode.RootId, objectId]).open).toBe(false);
  });
});

/**
 * A layout, and a root child with a key-bound action as an object node in a space would have.
 * Moving `version` past 1 rebuilds that action and adds a second binding.
 */
const makeHostPlugin = (fired: string[], version: Atom.Writable<number>) =>
  Plugin.define(Plugin.makeMeta({ key: DXN.make('example.com.plugin.host'), name: 'Host' })).pipe(
    Plugin.addModule({
      id: 'layout',
      provides: [AppCapabilities.Layout],
      activatesOn: ActivationEvents.Startup,
      activate: () =>
        Effect.succeed(
          Capability.contribute(
            AppCapabilities.Layout,
            Atom.make<AppCapabilities.Layout>({
              mode: 'test',
              dialogOpen: false,
              sidebarOpen: false,
              complementarySidebarOpen: false,
              workspace: GraphNode.RootId,
              active: [],
              inactive: [],
              scrollIntoView: undefined,
            }),
          ),
        ),
    }),
    Plugin.addModule({
      id: 'appGraphBuilder',
      provides: [AppCapabilities.AppGraphBuilder],
      activatesOn: ActivationEvents.Startup,
      activate: () =>
        Effect.gen(function* () {
          const children = yield* AppGraphBuilder.createExtension({
            id: 'object',
            match: GraphNodeMatcher.whenRoot,
            connector: () => Effect.succeed([{ id: OBJECT_SEGMENT, type: OBJECT_TYPE, data: null }]),
          });
          const actions = yield* AppGraphBuilder.createExtension({
            id: 'objectActions',
            match: GraphNodeMatcher.whenNodeType(OBJECT_TYPE),
            actions: (_node, get) => {
              const current = get(version);
              return Effect.succeed([
                AppGraphNode.makeAction({
                  id: 'present',
                  data: () => Effect.sync(() => void fired.push(`present ${current}`)),
                  properties: { label: 'Present', keyBinding: 'shift+meta+p' },
                }),
                ...(current > 1
                  ? [
                      AppGraphNode.makeAction({
                        id: 'rename',
                        data: () => Effect.sync(() => void fired.push('rename')),
                        properties: { label: 'Rename', keyBinding: 'shift+F6' },
                      }),
                    ]
                  : []),
              ]);
            },
          });
          return Capability.contribute(AppCapabilities.AppGraphBuilder, [...children, ...actions]);
        }),
    }),
    Plugin.make,
  );

const press = (key: string) =>
  document.body.dispatchEvent(
    new KeyboardEvent('keydown', { key, shiftKey: true, metaKey: true, bubbles: true, cancelable: true }),
  );

// Bindings sync on a 500 ms debounce after the graph changes.
const findBinding = (label: string) =>
  [...hotkeyStore.getState().commands.values()].find((command) => command.label === label);
