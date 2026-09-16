//
// Copyright 2026 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Atom from 'effect/unstable/reactivity/Atom';
import { describe, test } from 'vitest';

import * as ActivationEvents from '@dxos/app-framework/ActivationEvents';
import * as Capability from '@dxos/app-framework/Capability';
import * as Plugin from '@dxos/app-framework/Plugin';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphBuilder from '@dxos/app-graph/AppGraphBuilder';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { DXN } from '@dxos/echo';
import * as GraphNode from '@dxos/graph/GraphNode';
import * as GraphNodeMatcher from '@dxos/graph/GraphNodeMatcher';
import { createComposerTestApp } from '@dxos/plugin-testing/harness';
import { hotkeyStore, setHotkeyScope } from '@dxos/react-focus/store';

import { NavTreePlugin } from '#plugin';

const OBJECT_SEGMENT = 'object';
const OBJECT_TYPE = 'example.com.type.object';

/** A layout, and a root child with its own key-bound action as an object node in a space would have. */
const makeHostPlugin = (fired: string[]) =>
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
            actions: () =>
              Effect.succeed([
                AppGraphNode.makeAction({
                  id: 'present',
                  data: () => Effect.sync(() => void fired.push('present')),
                  properties: { label: 'Present', keyBinding: 'shift+meta+p' },
                }),
              ]),
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

describe('NavTreePlugin', () => {
  test('graph actions register hotkeys scoped to their parent node', async ({ expect }) => {
    const fired: string[] = [];
    await using harness = await createComposerTestApp({ plugins: [makeHostPlugin(fired)(), NavTreePlugin()] });

    const builder = await harness.waitForCapability(AppCapabilities.AppGraph);
    const { graph } = builder;
    const objectId = GraphNode.qualifyId(GraphNode.RootId, OBJECT_SEGMENT);
    AppGraph.expandSync(graph, GraphNode.RootId, 'child');
    await AppGraphBuilder.flush(builder);
    AppGraph.expandSync(graph, objectId, 'action');
    await AppGraphBuilder.flush(builder);

    await expect
      // Bindings sync on a 500 ms debounce after the graph changes.
      .poll(() => [...hotkeyStore.getState().commands.values()].find(({ label }) => label === 'Present')?.scopes, {
        timeout: 2_000,
      })
      .toEqual([objectId]);

    setHotkeyScope(objectId);
    press('P');
    await expect.poll(() => fired).toEqual(['present']);
  });
});
