//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import * as Option from 'effect/Option';
import React, { memo, useCallback, useMemo } from 'react';

import { Node } from '@dxos/app-graph';
import { useAppGraph } from '@dxos/app-toolkit/ui';
import { Graph, useActionRunner, useConnections, useEdges } from '@dxos/plugin-graph';
import { DensityProvider, IconButton, ScrollArea, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { DropdownMenu, type MenuItem, MenuProvider } from '@dxos/react-ui-menu';
import { Tabs } from '@dxos/react-ui-tabs';
import { hoverableControlItem, hoverableOpenControlItem } from '@dxos/ui-theme';

import { useActions, useIsAlternateTree, useLoadDescendents } from '../../hooks';
import { meta } from '../../meta';
import { NAV_TREE_ITEM } from '../NavTree';
import { useNavTreeContext } from '../NavTreeContext';
import { NavTreeItemAction, NavTreeItemColumns } from '../NavTreeItem';

export type L1PanelProps = {
  open?: boolean;
  path: string[];
  item: Node.Node;
  isCurrent: boolean;
  onBack?: () => void;
};

/**
 * Space or settings panel.
 */
const L1Panel$ = ({ open, path, item, isCurrent, onBack }: L1PanelProps) => {
  const { t } = useTranslation(meta.id);
  const title = toLocalizedString(item.properties.label, t);
  const isActivated = useIsActivatedWorkspace(item);
  const shouldRenderContent = isCurrent || isActivated;

  return (
    <Tabs.Tabpanel
      key={item.id}
      value={item.id}
      classNames={[
        'absolute inset-y-0 end-0',
        'w-[calc(100%-var(--dx-l0-size))] lg:w-(--dx-l1-size) grid-cols-1 grid-rows-[var(--dx-rail-size)_1fr]',
        'py-[env(safe-area-inset-top)]',
        isCurrent && 'grid',
      ]}
      tabIndex={-1}
      aria-label={title}
      {...(isCurrent && { 'data-testid': 'navtree.workspace.visible' })}
      {...(!open && { inert: true })}
    >
      {shouldRenderContent && <L1PanelContent open={open} path={path} item={item} onBack={onBack} />}
    </Tabs.Tabpanel>
  );
};

/** Determines whether a workspace tab has been populated with real child content (i.e. expanded at least once). */
const useIsActivatedWorkspace = (item: Node.Node): boolean => {
  const { graph } = useAppGraph();
  const edges = useEdges(graph, item.id);

  return useMemo(() => {
    const childIds = edges[Graph.relationKey('child')] ?? [];
    return childIds.some((childId) => {
      const child = Graph.getNode(graph, childId);
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
const L1PanelContent = ({ path, item, onBack }: Pick<L1PanelProps, 'open' | 'path' | 'item' | 'onBack'>) => {
  const navTreeContext = useNavTreeContext();

  const alternateTree = useAlternateTreeItem(item);
  const alternatePath = useMemo(() => [...path, item.id], [item.id, path]);
  const isAlternate = useIsAlternateTree(alternatePath, item);

  return (
    <DensityProvider density='fine'>
      <L1PanelHeader path={path} item={item} onBack={onBack} />
      <ScrollArea.Root thin orientation='vertical'>
        <ScrollArea.Viewport>
          {isAlternate && alternateTree ? (
            <Tree
              model={navTreeContext.model}
              id={alternateTree.id}
              rootId={alternateTree.id}
              path={alternatePath}
              levelOffset={5}
              gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
              renderColumns={NavTreeItemColumns}
              blockInstruction={navTreeContext.blockInstruction}
              canDrop={navTreeContext.canDrop}
              canSelect={navTreeContext.canSelect}
              onOpenChange={navTreeContext.onOpenChange}
              onSelect={navTreeContext.onSelect}
              onItemHover={navTreeContext.onItemHover}
            />
          ) : (
            <Tree
              model={navTreeContext.model}
              id={item.id}
              rootId={item.id}
              path={path}
              levelOffset={5}
              gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
              draggable
              renderColumns={NavTreeItemColumns}
              blockInstruction={navTreeContext.blockInstruction}
              canDrop={navTreeContext.canDrop}
              canSelect={navTreeContext.canSelect}
              onOpenChange={navTreeContext.onOpenChange}
              onSelect={navTreeContext.onSelect}
              onItemHover={navTreeContext.onItemHover}
            />
          )}
        </ScrollArea.Viewport>
      </ScrollArea.Root>
    </DensityProvider>
  );
};

/**
 * Header row.
 */
const L1PanelHeader = ({ item, path, onBack }: Pick<L1PanelProps, 'item' | 'path' | 'onBack'>) => {
  const { t } = useTranslation(meta.id);
  const { renderItemEnd: ItemEnd } = useNavTreeContext();
  const title = toLocalizedString(item.properties.label, t);
  const backCapableWorkspace = item.id.startsWith('!');

  const { primaryAction, groupedActions, menuActions, onAction } = useL1MenuActions({ item, path });
  useLoadDescendents(item);

  return (
    <div className='flex w-full items-center border-b border-subdued-separator dx-app-drag dx-density-coarse pe-1'>
      {backCapableWorkspace ? (
        <IconButton
          size={5}
          density='coarse'
          classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
          variant='ghost'
          icon='ph--caret-left--regular'
          iconOnly
          label={t('button back')}
          data-testid='treeView.primaryTreeButton'
          onClick={() => onBack?.()}
        />
      ) : (
        <div className='w-6' />
      )}
      <h2 className='flex-1 truncate min-w-0'>{title}</h2>
      {/* TODO(wittjosiah): Reconcile with NavTreeItemColumns. */}
      <div role='none' className='contents dx-app-no-drag'>
        {primaryAction?.properties?.disposition === 'list-item-primary' && !primaryAction?.properties?.disabled && (
          <NavTreeItemAction
            testId={primaryAction.properties?.testId}
            label={toLocalizedString(primaryAction.properties?.label, t)}
            icon={primaryAction.properties?.icon ?? 'ph--placeholder--regular'}
            parent={item}
            path={path}
            monolithic={Node.isAction(primaryAction)}
            menuActions={Node.isAction(primaryAction) ? [primaryAction] : groupedActions[primaryAction?.id ?? '']}
            menuType={primaryAction.properties?.menuType}
            caller={NAV_TREE_ITEM}
          />
        )}
        {menuActions.length === 1 && (
          <IconButton
            size={5}
            density='coarse'
            classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
            variant='ghost'
            icon={menuActions[0].properties?.icon ?? 'ph--placeholder--regular'}
            iconOnly
            label={toLocalizedString(menuActions[0].properties?.label, t)}
            data-testid={menuActions[0].properties?.testId}
            onClick={() => onAction(menuActions[0] as Node.Action)}
          />
        )}
        {menuActions.length > 1 && (
          <MenuProvider onAction={onAction}>
            <DropdownMenu.Root group={item} items={menuActions as MenuItem[]} caller={NAV_TREE_ITEM}>
              <DropdownMenu.Trigger asChild>
                <IconButton
                  size={5}
                  density='coarse'
                  classNames={['shrink-0 px-2 pointer-fine:px-1', hoverableControlItem, hoverableOpenControlItem]}
                  variant='ghost'
                  icon='ph--dots-three-vertical--regular'
                  iconOnly
                  label={t('tree item actions label')}
                  data-testid='navtree.treeItem.actionsLevel0'
                />
              </DropdownMenu.Trigger>
            </DropdownMenu.Root>
          </MenuProvider>
        )}
        {ItemEnd && <ItemEnd node={item} open />}
      </div>
    </div>
  );
};

/**
 * Builds the menu actions for the L1 panel header, combining graph actions with a synthetic settings/back action.
 */
const useL1MenuActions = ({ item, path }: Pick<L1PanelProps, 'item' | 'path'>) => {
  const { t } = useTranslation(meta.id);
  const { setAlternateTree } = useNavTreeContext();
  const { graph } = useAppGraph();
  const runAction = useActionRunner();

  const alternateTree = useAlternateTreeItem(item);
  const alternatePath = useMemo(() => [...path, item.id], [item.id, path]);
  const isAlternate = useIsAlternateTree(alternatePath, item);

  // Graph actions.
  const { actions: actionsProp, groupedActions } = useActions(item, path);
  const [primaryAction, ...secondaryActions] = actionsProp.toSorted((a, _b) =>
    a.properties?.disposition === 'list-item-primary' ? -1 : 1,
  );

  const graphMenuActions = (
    primaryAction?.properties?.disposition === 'list-item-primary' ? secondaryActions : actionsProp
  )
    .flatMap((action) => (Node.isAction(action) ? [action] : []))
    .filter((a) => ['list-item', 'list-item-primary'].includes(a.properties?.disposition));

  // Synthetic settings/back action.
  const settingsActionId = `${item.id}~settings`;
  const settingsAction = useMemo((): Node.Action | undefined => {
    if (!alternateTree) {
      return undefined;
    }
    return {
      id: settingsActionId,
      type: Node.ActionType,
      data: () => Effect.void,
      properties: {
        label: isAlternate ? ['button back', { ns: meta.id }] : (alternateTree.properties.label ?? alternateTree.id),
        icon: isAlternate
          ? 'ph--arrow-u-down-left--regular'
          : (alternateTree.properties.icon ?? 'ph--placeholder--regular'),
        disposition: 'list-item',
        testId: isAlternate ? 'navtree.backToSpace' : 'navtree.spaceSettings',
      },
    } as Node.Action;
  }, [alternateTree, isAlternate, settingsActionId, t]);

  const menuActions = useMemo(
    () => [...graphMenuActions, ...(settingsAction ? [settingsAction] : [])],
    [graphMenuActions, settingsAction],
  );

  const onAction = useCallback(
    (action: Node.Action, params?: Node.InvokeProps) => {
      if (action.id === settingsActionId) {
        if (alternateTree && !isAlternate) {
          Graph.expand(graph, alternateTree.id, 'child');
        }
        setAlternateTree?.(alternatePath, !isAlternate);
      } else {
        void runAction(action, { ...params, path });
      }
    },
    [settingsActionId, setAlternateTree, alternatePath, isAlternate, runAction, graph, alternateTree, path],
  );

  return { primaryAction, groupedActions, menuActions, onAction };
};

/** Finds the first child with disposition 'alternate-tree' using graph connections directly. */
const useAlternateTreeItem = (item: Node.Node): Node.Node | undefined => {
  const { graph } = useAppGraph();
  const connections = useConnections(graph, item.id, 'child');
  return connections.find((node) => node.properties.disposition === 'alternate-tree');
};

export const L1Panel = memo(L1Panel$);
