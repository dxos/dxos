//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';

import * as Capabilities from '@dxos/app-framework/Capabilities';
import * as Capability from '@dxos/app-framework/Capability';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppCapabilities from '@dxos/app-toolkit/AppCapabilities';
import { debounce } from '@dxos/async';
import * as GraphNode from '@dxos/graph/GraphNode';
import { runAction } from '@dxos/plugin-graph';
import { hotkeyStore, initHotkeys, setHotkeyScope } from '@dxos/react-focus/store';
import { resolveKeyBinding } from '@dxos/util';

import { KEY_BINDING } from '#meta';

export default Capability.makeModule(
  Effect.fnUntraced(function* () {
    const { graph } = yield* AppCapabilities.AppGraph;
    const invoker = yield* Capabilities.OperationInvoker;
    const pluginContext = yield* Capability.Service;

    // Ids registered by the last sync, so a re-sync can retire the ones the graph no longer has.
    let registered = new Set<string>();

    // TODO(wittjosiah): Factor out.
    const visitor = (seen: Set<string>) => (node: AppGraphNode.Node, path: string[]) => {
      const shortcut = resolveKeyBinding(node.properties.keyBinding);

      if (shortcut && AppGraphNode.isAction(node)) {
        // The parent's id is already the full scope path.
        const parentId = path.at(-2) ?? GraphNode.RootId;
        const id = `${parentId}:${node.id}`;
        seen.add(id);
        // This re-runs on every graph change, and each store mutation notifies every subscriber.
        const existing = hotkeyStore.getState().commands.get(id);
        if (existing?.hotkey === shortcut && JSON.stringify(existing.label) === JSON.stringify(node.properties.label)) {
          return;
        }

        hotkeyStore.unregister(id);
        hotkeyStore.register({
          id,
          hotkey: shortcut,
          scopes: [parentId],
          label: node.properties.label,
          // Resolved when fired, since an unchanged binding keeps the closure it was registered with.
          action: () => {
            const current = Option.getOrUndefined(AppGraph.getNode(graph, node.id));
            if (current && AppGraphNode.isAction(current)) {
              void runAction(invoker, pluginContext, current, { parent: current, caller: KEY_BINDING });
            }
          },
          // Bindings came from graph actions, which fired everywhere; Ark excludes text fields
          // unless a command opts in.
          options: { enableOnFormTags: true, enableOnContentEditable: true },
        });
      }
    };

    const syncBindings = () => {
      const seen = new Set<string>();
      AppGraph.traverse(graph, { relation: ['child', 'action'], visitor: visitor(seen) });
      // Actions the graph has dropped since the last pass.
      for (const id of registered) {
        if (!seen.has(id)) {
          hotkeyStore.unregister(id);
        }
      }
      registered = seen;
    };

    const eventHandler = debounce(syncBindings, 500);

    const unsubscribe = graph.onNodeChanged.on(eventHandler);
    syncBindings();

    // TODO(burdon): Create context and plugin.
    initHotkeys();
    setHotkeyScope(GraphNode.RootId);

    // Edits persist as they are made, so save has nothing to flush; the binding exists to keep the
    // browser's "Save page" dialog from opening anywhere in the app.
    const saveId = `${GraphNode.RootId}:save`;
    hotkeyStore.register({
      id: saveId,
      hotkey: 'mod+s',
      scopes: [GraphNode.RootId],
      label: 'Save document',
      action: () => {},
      options: { enableOnFormTags: true, enableOnContentEditable: true },
    });

    yield* Effect.addFinalizer(() =>
      Effect.sync(() => {
        unsubscribe();
        // Only the bindings this capability registered: the store is shared with every component
        // that calls `useHotkeys`, so destroying it here would silently unbind all of them.
        for (const id of registered) {
          hotkeyStore.unregister(id);
        }
        registered = new Set();
        hotkeyStore.unregister(saveId);
      }),
    );
    return [];
  }),
);
