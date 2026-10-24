//
// Copyright 2026 DXOS.org
//

import React, { useCallback, useEffect, useRef, useState } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import type * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { ActionMenu, type MenuItem } from '@dxos/react-ui-menu';

import { getListActions, useActions } from '#hooks';

/** Reported as the caller of an action run from the context menu. */
export const CONTEXT_MENU = 'contextMenu';

type Target = { id: string; x: number; y: number };

/**
 * The app's context menu: right-clicking an element marked with {@link AppNode.contextMenuProps} opens the actions of
 * the graph node it names, the same list the navtree shows for that node. Unmarked elements keep the browser's menu.
 */
export const ContextMenuRoot = () => {
  const { graph } = Hooks.useAppGraph();
  const [target, setTarget] = useState<Target>();

  useEffect(() => {
    const handleContextMenu = (event: MouseEvent) => {
      const element =
        event.target instanceof Element ? event.target.closest(`[${AppNode.CONTEXT_MENU_ATTRIBUTE}]`) : null;
      const id = element?.getAttribute(AppNode.CONTEXT_MENU_ATTRIBUTE);
      if (!id) {
        return;
      }
      event.preventDefault();
      // The node may not be in the graph yet (its parent never expanded), and its actions are built on demand.
      AppGraph.expandPath(graph, id);
      AppGraph.expandSync(graph, id, 'action');
      setTarget({ id, x: event.clientX, y: event.clientY });
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, [graph]);

  const handleClose = useCallback(() => setTarget(undefined), []);

  return target ? (
    <NodeContextMenu key={`${target.id}:${target.x}:${target.y}`} {...target} onClose={handleClose} />
  ) : null;
};

ContextMenuRoot.displayName = 'ContextMenuRoot';

type NodeContextMenuProps = Target & { onClose: () => void };

/** Waits for the node, then opens its list actions at the pointer. */
const NodeContextMenu = ({ id, x, y, onClose }: NodeContextMenuProps) => {
  const { graph } = Hooks.useAppGraph();
  const node = GraphHooks.useNode(graph, id);
  return node ? <NodeActionMenu node={node} x={x} y={y} onClose={onClose} /> : null;
};

type NodeActionMenuProps = Omit<NodeContextMenuProps, 'id'> & { node: AppGraphNode.Node };

const NodeActionMenu = ({ node, x, y, onClose }: NodeActionMenuProps) => {
  const anchorRef = useRef<HTMLDivElement>(null);
  const actions = getListActions(useActions(node));
  const runAction = GraphHooks.useActionRunner();
  const handleAction = useCallback(
    (action: AppGraphNode.Action, params: AppGraphNode.InvokeProps = {}) => runAction(action, params),
    [runAction],
  );

  return (
    <>
      {/* The menu opens at the pointer: a zero-size anchor where the right-click landed. */}
      <div ref={anchorRef} aria-hidden className='fixed pointer-events-none' style={{ left: x, top: y }} />
      {actions.length > 0 && (
        <ActionMenu
          open
          onOpenChange={(open) => !open && onClose()}
          virtualRef={anchorRef}
          caller={CONTEXT_MENU}
          onAction={handleAction}
          group={node}
          actions={actions as MenuItem[]}
        />
      )}
    </>
  );
};
