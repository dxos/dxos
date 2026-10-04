//
// Copyright 2025 DXOS.org
//

import * as Option from 'effect/Option';
import React, { memo, useCallback, useMemo } from 'react';

import * as AppGraph from '@dxos/app-graph/AppGraph';
import * as AppGraphNode from '@dxos/app-graph/AppGraphNode';
import * as AppNode from '@dxos/app-toolkit/AppNode';
import * as Hooks from '@dxos/app-toolkit/Hooks';
import * as GraphHooks from '@dxos/plugin-graph/Hooks';
import { Tree, type TreeNode } from '@dxos/react-ui-list';
import { ActionMenu, type MenuItem } from '@dxos/react-ui-menu';
import * as Button from '@dxos/react-ui/Button';
import * as Empty from '@dxos/react-ui/Empty';
import * as UiHooks from '@dxos/react-ui/Hooks';
import * as Icon from '@dxos/react-ui/Icon';
import * as Main from '@dxos/react-ui/Main';
import * as Tabs from '@dxos/react-ui/Tabs';
import * as Theme from '@dxos/react-ui/Theme';
import { hoverableControlItem, hoverableOpenControlItem } from '@dxos/ui-theme';

import { getListActions, useActions, useLoadDescendents } from '#hooks';
import { meta } from '#meta';
import { type NavTreeNode } from '#types';

import { NAV_TREE_ITEM } from '../NavTree/index.ts';
import { useNavTreeContext } from '../NavTreeContext/index.ts';
import { NavTreeItemColumns } from '../NavTreeItem/NavTreeItemColumns.tsx';

/**
 * Width held for the item-end slot, whose surface resolves after the tree has painted: a
 * `min-content` track would start collapsed and re-truncate every label when it lands. Sized to
 * what fills it, an `AttentionGlyph` (`w-3`) inset by `mx-1`.
 */
const ITEM_END_SIZE = '1.25rem';

/** Delay before a pending or unavailable workspace renders anything. */
const RENDER_DELAY = '1s';

export type L1PanelProps = {
  open?: boolean;
  path: string[];
  /** The tab's workspace id, which may name a workspace that has no graph node. */
  id: string;
  /** Absent when the workspace is not in the graph; the panel then renders the unavailable message. */
  item?: AppGraphNode.Node;
  /** Whether the workspace this tab names is known to be missing, rather than still on its way. */
  unavailable?: boolean;
  isCurrent: boolean;
  onBack?: () => void;
};

/**
 * Space or settings panel. Without an `item` — a link to a workspace this identity never had or which no
 * longer exists, or persisted deck state pointing at one after a profile switch — the panel body is the
 * unavailable-workspace message, so the sidebar is never blank.
 */
const L1PanelInner = ({ open, path, id, item, unavailable, isCurrent, onBack }: L1PanelProps) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const pending = item?.properties.pending === true;
  const title = item ? Theme.toLocalizedString(item.properties.label, t) : t('workspace-unavailable.heading');
  const isActivated = useIsActivatedWorkspace(id);
  const shouldRenderContent = isCurrent || isActivated;
  // The panel is a focus area of its own, after the rail.
  const landmark = Main.useMainLandmark(0.5);

  return (
    <Tabs.Content
      key={id}
      value={id}
      classNames={[
        'absolute inset-y-0 end-0',
        'w-[calc(100%-var(--dx-l0-size))] lg:w-(--dx-l1-size) grid-cols-1 grid-rows-[var(--dx-rail-size)_1fr]',
        'py-[env(safe-area-inset-top)]',
        isCurrent && 'grid',
      ]}
      tabIndex={-1}
      {...(isCurrent && landmark)}
      aria-label={title}
      // An unavailable workspace has no tab in the rail, so the generated `aria-labelledby` would
      // reference a missing element.
      {...(!item && { 'aria-labelledby': undefined })}
      {...(isCurrent && {
        'data-testid': pending
          ? 'navtree.workspace.pending'
          : item
            ? 'navtree.workspace.visible'
            : 'navtree.workspace.unavailable',
      })}
      {...(!open && { inert: true })}
    >
      {shouldRenderContent &&
        (pending ? (
          <div
            role='status'
            aria-label={t('pending-workspace.label')}
            className='row-start-2 self-start flex justify-center p-4 animate-fade-in'
            style={{ animationDelay: RENDER_DELAY, animationFillMode: 'backwards' }}
          >
            <Icon.Icon icon='ph--spinner-gap--regular' size='xl' spin />
          </div>
        ) : item ? (
          <L1PanelContent open={open} path={path} item={item} onBack={onBack} />
        ) : (
          unavailable && (
            <Empty.Empty
              key={id}
              classNames='row-start-2 self-start animate-fade-in'
              style={{ animationDelay: RENDER_DELAY, animationFillMode: 'backwards' }}
            >
              {t('workspace-unavailable.description')}
            </Empty.Empty>
          )
        ))}
    </Tabs.Content>
  );
};

/** Determines whether a workspace tab has been populated with real child content (i.e. expanded at least once). */
const useIsActivatedWorkspace = (id: string): boolean => {
  const { graph } = Hooks.useAppGraph();
  const edges = GraphHooks.useEdges(graph, id);

  return useMemo(() => {
    const childIds = edges[AppGraph.relationKey('child')] ?? [];
    return childIds.some((childId) => {
      const child = AppGraph.getNode(graph, childId);
      if (Option.isNone(child)) {
        return false;
      }
      return child.value.properties.disposition === undefined;
    });
  }, [edges, graph]);
};

/**
 * Mounted panel content for active or previously-visited tabs.
 */
const L1PanelContent = ({
  path,
  item,
  onBack,
}: Pick<L1PanelProps, 'open' | 'path' | 'onBack'> & { item: AppGraphNode.Node }) => {
  const navTreeContext = useNavTreeContext();

  return (
    <>
      <L1PanelHeader path={path} item={item} onBack={onBack} />
      <Tree.Root
        model={navTreeContext.model}
        id={item.id}
        rootId={item.id}
        path={path}
        size='md'
        draggable
        columns={COLUMNS}
        canDrop={navTreeContext.canDrop}
        getDropKind={navTreeContext.getDropKind}
        canSelect={navTreeContext.canSelect}
        onOpenChange={navTreeContext.onOpenChange}
        onSelect={navTreeContext.onSelect}
        onItemHover={navTreeContext.onItemHover}
      >
        <Tree.Content>{renderRow}</Tree.Content>
      </Tree.Root>
    </>
  );
};

/** Disclosure, icon, label, count, the actions menu, then the late item-end surface. */
const COLUMNS = `var(--dx-half-block-size) var(--dx-block-size) minmax(0, 1fr) auto min-content minmax(${ITEM_END_SIZE}, min-content)`;

const renderRow = (node: TreeNode<NavTreeNode.NavTreeItemGraphNode>) => (
  <Tree.Item node={node}>
    <Tree.ItemIndicator />
    <Tree.ItemIcon />
    <Tree.ItemText data-testid='treeItem.heading' />
    <Tree.ItemCount />
    {node.item && <NavTreeItemColumns path={node.path} item={node.item} open={node.open} />}
  </Tree.Item>
);

/**
 * Header row.
 */
const L1PanelHeader = ({ item, path, onBack }: Pick<L1PanelProps, 'path' | 'onBack'> & { item: AppGraphNode.Node }) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);
  const { renderItemEnd: ItemEnd } = useNavTreeContext();
  const title = Theme.toLocalizedString(item.properties.label, t);
  const backCapableWorkspace = AppNode.isPinnedWorkspace(item);

  const { menuActions, onAction } = useL1MenuActions({ item, path });
  useLoadDescendents(item);

  return (
    <div
      data-tauri-drag-region='deep'
      className='grid w-full items-center px-2 dx-app-drag dx-density-lg'
      // Same late item-end surface and inline inset as the tree rows below, so its actions and status line up with theirs.
      style={{ gridTemplateColumns: `28px 1fr min-content minmax(${ITEM_END_SIZE}, min-content)` }}
    >
      {backCapableWorkspace ? (
        <Button.Button
          classNames={[hoverableControlItem, hoverableOpenControlItem]}
          variant='ghost'
          icon='ph--caret-left--regular'
          iconOnly
          iconSize='md'
          label={t('button-back.button')}
          data-testid='treeView.primaryTreeButton'
          onClick={() => onBack?.()}
        />
      ) : (
        <div />
      )}
      <h2 className='flex-1 truncate min-w-0'>{title}</h2>
      <div className='contents dx-app-no-drag'>
        <MenuActions item={item} menuActions={menuActions} onAction={onAction} />
        {ItemEnd && <ItemEnd node={item} open />}
      </div>
    </div>
  );
};

type L1MenuActions = {
  menuActions: AppGraphNode.Action[];
  onAction: (action: AppGraphNode.Action, params?: AppGraphNode.InvokeProps) => void;
};

/**
 * Header menu actions for an L1 workspace tab. Renders nothing for an empty
 * `menuActions`, a single inline icon button for one action, and a
 * `…`-menu trigger for multiple.
 */
const MenuActions = ({
  item,
  menuActions,
  onAction,
}: {
  item: AppGraphNode.Node;
} & Pick<L1MenuActions, 'menuActions' | 'onAction'>) => {
  const { t } = UiHooks.useTranslation(meta.profile.key);

  if (menuActions.length === 0) {
    return null;
  }

  if (menuActions.length === 1) {
    return (
      <Button.Button
        classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
        variant='ghost'
        icon={menuActions[0].properties?.icon ?? 'ph--circle-dashed--regular'}
        iconOnly
        iconSize='md'
        label={Theme.toLocalizedString(menuActions[0].properties?.label, t)}
        data-testid={menuActions[0].properties?.testId}
        onClick={() => onAction(menuActions[0] as AppGraphNode.Action)}
      />
    );
  }

  return (
    <ActionMenu caller={NAV_TREE_ITEM} onAction={onAction} group={item} actions={menuActions as MenuItem[]}>
      <Button.Button
        classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
        variant='ghost'
        icon='ph--dots-three-vertical--regular'
        iconOnly
        iconSize='md'
        label={t('tree-item-actions.label')}
        data-testid='navtree.treeItem.actionsLevel0'
      />
    </ActionMenu>
  );
};

/**
 * Builds the menu actions for the L1 panel header.
 */
const useL1MenuActions = ({ item, path }: Pick<L1PanelProps, 'path'> & { item: AppGraphNode.Node }): L1MenuActions => {
  const runAction = GraphHooks.useActionRunner();

  const menuActions = getListActions(useActions(item));

  const onAction = useCallback(
    (action: AppGraphNode.Action, params?: AppGraphNode.InvokeProps) => {
      void runAction(action, { ...params, path });
    },
    [runAction, path],
  );

  return { menuActions, onAction };
};

export const L1Panel = memo(L1PanelInner);
