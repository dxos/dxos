//
// Copyright 2025 DXOS.org
//

import * as Effect from 'effect/Effect';
import React, { useCallback, useMemo } from 'react';

import { Node } from '@dxos/app-graph';
import { useActionRunner } from '@dxos/plugin-graph';
import { DensityProvider, IconButton, ScrollArea, toLocalizedString, useTranslation } from '@dxos/react-ui';
import { Tree } from '@dxos/react-ui-list';
import { DropdownMenu, type MenuItem, MenuProvider } from '@dxos/react-ui-menu';
import { Tabs } from '@dxos/react-ui-tabs';
import { hoverableControlItem, hoverableOpenControlItem } from '@dxos/ui-theme';

import { useActions, useFilteredItems, useIsAlternateTree, useLoadDescendents } from '../../hooks';
import { meta } from '../../meta';
import { NAV_TREE_ITEM } from '../NavTree';
import { useNavTreeContext } from '../NavTreeContext';
import { NavTreeItemAction, NavTreeItemColumns } from '../NavTreeItem';

export type L1PanelProps = {
  open?: boolean;
  path: string[];
  item: Node.Node;
  currentItemId: string;
  onBack?: () => void;
};

/**
 * Space or settings panel.
 * Only the active panel renders its content tree to avoid subscription/effect cascades from hidden panels.
 */
export const L1Panel = ({ open, path, item, currentItemId, onBack }: L1PanelProps) => {
  const { t } = useTranslation(meta.id);
  const title = toLocalizedString(item.properties.label, t);

  return (
    <Tabs.Tabpanel
      key={item.id}
      value={item.id}
      classNames={[
        'absolute inset-y-0 end-0',
        'w-[calc(100%-var(--l0-size))] lg:w-(--l1-size) grid-cols-1 grid-rows-[var(--rail-size)_1fr]',
        'py-[env(safe-area-inset-top)]',
        item.id === currentItemId && 'grid',
      ]}
      tabIndex={-1}
      aria-label={title}
      {...(!open && { inert: true })}
    >
      {item.id === currentItemId && (
        <L1PanelContent open={open} path={path} item={item} currentItemId={currentItemId} onBack={onBack} />
      )}
    </Tabs.Tabpanel>
  );
};

/**
 * Active panel content — only mounted for the current tab to avoid effect cascades.
 */
const L1PanelContent = ({ path, item, currentItemId, onBack }: L1PanelProps) => {
  const navTreeContext = useNavTreeContext();

  // TODO(wittjosiah): Support multiple alternate trees.
  const alternateTree = useFilteredItems(item, { disposition: 'alternate-tree' })[0];
  const alternatePath = useMemo(() => [...path, item.id], [item.id, path]);
  const isAlternate = useIsAlternateTree(alternatePath, item);

  return (
    <DensityProvider density='fine'>
      <L1PanelHeader path={path} item={item} currentItemId={currentItemId} onBack={onBack} />
      <ScrollArea.Root thin orientation='vertical'>
        <ScrollArea.Viewport>
          {isAlternate ? (
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
const L1PanelHeader = ({ item, path }: L1PanelProps) => {
  const { t } = useTranslation(meta.id);
  const { renderItemEnd: ItemEnd } = useNavTreeContext();
  const title = toLocalizedString(item.properties.label, t);

  const { primaryAction, groupedActions, menuActions, onAction } = useL1MenuActions({ item, path });
  useLoadDescendents(item);

  return (
    <div className='flex w-full items-center border-b border-subdued-separator app-drag density-coarse pe-1'>
      <div className='w-6' />
      <h2 className='flex-1 truncate min-w-0'>{title}</h2>
      {/* TODO(wittjosiah): Reconcile with NavTreeItemColumns. */}
      <div role='none' className='contents app-no-drag'>
        {primaryAction?.properties?.disposition === 'list-item-primary' && !primaryAction?.properties?.disabled && (
          <NavTreeItemAction
            testId={primaryAction.properties?.testId}
            label={toLocalizedString(primaryAction.properties?.label, t)}
            icon={primaryAction.properties?.icon ?? 'ph--placeholder--regular'}
            parent={item}
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
  const runAction = useActionRunner();

  // TODO(wittjosiah): Support multiple alternate trees.
  const alternateTree = useFilteredItems(item, { disposition: 'alternate-tree' })[0];
  const alternatePath = useMemo(() => [...path, item.id], [item.id, path]);
  const isAlternate = useIsAlternateTree(alternatePath, item);

  // Graph actions.
  const { actions: _actions, groupedActions } = useActions(item);
  const [primaryAction, ...secondaryActions] = _actions.toSorted((a, _b) =>
    a.properties?.disposition === 'list-item-primary' ? -1 : 1,
  );

  const graphMenuActions = (
    primaryAction?.properties?.disposition === 'list-item-primary' ? secondaryActions : _actions
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
        setAlternateTree?.(alternatePath, !isAlternate);
      } else {
        void runAction(action, params);
      }
    },
    [settingsActionId, setAlternateTree, alternatePath, isAlternate, runAction],
  );

  return { primaryAction, groupedActions, menuActions, onAction };
};
