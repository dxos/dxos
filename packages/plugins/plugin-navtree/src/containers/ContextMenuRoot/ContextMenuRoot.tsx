//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';

import * as AppHooks from '@dxos/app-framework/Hooks';
import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as AppSpace from '@dxos/app-toolkit/AppSpace';
import * as GraphPath from '@dxos/app-toolkit/GraphPath';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as LayoutOperation from '@dxos/app-toolkit/LayoutOperation';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { ActionMenu, type MenuItem, createLineSeparator } from '@dxos/react-ui-menu';

import { getListActions, useActions } from '#hooks';

import { type NativeContext, globalActions, nativeActions, readNativeContext } from './native-actions.ts';

/** Reported as the caller of an action run from the context menu. */
export const CONTEXT_MENU = 'contextMenu';

type Target = {
  id?: string;
  caller?: string;
  x: number;
  y: number;
  native: NativeContext;
  commands?: AppNode.EditCommands;
};

/**
 * The app's context menu, which replaces the browser's everywhere: right-clicking an element marked with
 * {@link AppNode.contextMenuProps} (a navtree row, a tile, a plank and its content) lists the actions of the graph node
 * it names, the same list the navtree shows, followed by what the browser's menu would have offered there (open or copy
 * a link or image; cut, copy, paste) and the undo and redo of a container registered with
 * {@link AppNode.registerEditCommands}. A component that handles the right-click itself (it calls `preventDefault`) keeps
 * it, and in development Shift + right-click opens the browser's menu for inspecting.
 */
export const ContextMenuRoot = () => {
  const { graph } = Hooks.useAppGraph();
  const [target, setTarget] = useState<Target>();

  useEffect(() => {
    const marked = (event: Event) =>
      event.target instanceof Element ? event.target.closest(`[${AppNode.CONTEXT_MENU_ATTRIBUTE}]`) : null;
    const targetId = (event: Event) => marked(event)?.getAttribute(AppNode.CONTEXT_MENU_ATTRIBUTE) ?? undefined;
    // The node may not be in the graph yet (its parent never expanded), and its actions are built on demand, so both
    // are asked for as the pointer arrives, ready by the time it right-clicks.
    // Expanded on an earlier event, so a flush has since run and the graph's actions for it can be trusted.
    const expanded = new Set<string>();
    const expand = (id: string) => {
      AppGraph.expandPath(graph, id);
      AppGraph.expandSync(graph, id, 'action');
      expanded.add(id);
    };
    const handlePointerOver = (event: PointerEvent) => {
      const id = targetId(event);
      if (id) {
        expand(id);
      }
    };
    const handleContextMenu = (event: MouseEvent) => {
      if (event.defaultPrevented || (event.shiftKey && import.meta.env.DEV)) {
        return;
      }
      event.preventDefault();
      // Inside a menu (this one, a dropdown, a submenu), a right-click opens nothing.
      if (event.target instanceof Element && event.target.closest('[role="menu"], [role="menubar"]')) {
        return;
      }
      const id = targetId(event);
      if (id && !expanded.has(id)) {
        // Not hovered first (e.g. the menu key): the menu opens now and fills in once the node's actions are built.
        expand(id);
      }
      setTarget({
        id,
        caller: marked(event)?.getAttribute(AppNode.CONTEXT_MENU_CALLER_ATTRIBUTE) ?? undefined,
        x: event.clientX,
        y: event.clientY,
        native: readNativeContext(event.target),
        commands: AppNode.findEditCommands(event.target),
      });
    };
    document.addEventListener('pointerover', handlePointerOver);
    document.addEventListener('contextmenu', handleContextMenu);
    return () => {
      document.removeEventListener('pointerover', handlePointerOver);
      document.removeEventListener('contextmenu', handleContextMenu);
    };
  }, [graph]);

  const handleClose = useCallback(() => setTarget(undefined), []);

  return target ? <ContextMenu key={`${target.id}:${target.x}:${target.y}`} {...target} onClose={handleClose} /> : null;
};

ContextMenuRoot.displayName = 'ContextMenuRoot';

type ContextMenuProps = Target & { onClose: () => void };

/** Opens at the pointer with the node's list actions (once the node resolves) and the browser's own offerings. */
const ContextMenu = ({ id, ...props }: ContextMenuProps) => {
  const { graph } = Hooks.useAppGraph();
  const node = GraphHooks.useNode(graph, id ?? '');
  // A marked node not in the graph yet joins the menu when it resolves; until then only the browser's offerings show.
  return node ? <NodeMenu node={node} {...props} /> : <PointerMenu {...props} />;
};

const NodeMenu = ({ node, ...props }: Omit<ContextMenuProps, 'id'> & { node: AppGraphNode.Node }) => (
  <PointerMenu {...props} node={node} nodeActions={getListActions(useActions(node))} />
);

type PointerMenuProps = Omit<ContextMenuProps, 'id'> & {
  node?: AppGraphNode.Node;
  nodeActions?: MenuItem[];
};

const PointerMenu = ({ node, nodeActions = [], caller, x, y, native, commands, onClose }: PointerMenuProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const { invokePromise } = AppHooks.useOperationInvoker();
  // The id from the layout, not `useActiveSpace`, whose space lookup needs a client the menu has no other use for.
  const spaceId = AppSpace.getActiveSpaceId(Hooks.useLayout().workspace);
  const handleHome = useMemo(
    () =>
      spaceId
        ? () =>
            void invokePromise(LayoutOperation.Open, {
              subject: [GraphPath.getSpaceHomePath(spaceId)],
              workspace: GraphPath.getSpacePath(spaceId),
            })
        : undefined,
    [spaceId, invokePromise],
  );
  // Sections, each set off by a line: the node's actions, the browser's offerings, then navigation.
  const actions = useMemo<MenuItem[]>(
    () =>
      [nodeActions, nativeActions(native, commands), globalActions({ onHome: handleHome })]
        .filter((section) => section.length > 0)
        .flatMap((section, index) =>
          index === 0 ? section : [...createLineSeparator(`separator-${index}`).nodes, ...section],
        ),
    [nodeActions, native, commands, handleHome],
  );
  const runAction = GraphHooks.useActionRunner();
  const handleAction = useCallback(
    (action: AppGraphNode.Action, params: AppGraphNode.InvokeProps = {}) => runAction(action, params),
    [runAction],
  );

  return (
    <>
      {/* The menu opens at the pointer: a zero-size anchor where the right-click landed. */}
      <div ref={anchorRef} aria-hidden className='fixed pointer-events-none' style={{ left: x, top: y }} />
      <ActionMenu
        open
        onOpenChange={(open) => !open && onClose()}
        virtualRef={anchorRef}
        caller={caller ?? CONTEXT_MENU}
        onAction={handleAction}
        group={node}
        actions={actions}
      />
    </>
  );
};
