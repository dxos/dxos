//
// Copyright 2024 DXOS.org
//

import React, { Fragment, useCallback, useEffect, type FC } from 'react';

import { isAction, type Node } from '@dxos/app-graph';
import { Popover, toLocalizedString, Treegrid, useTranslation } from '@dxos/react-ui';
import { type ItemType, Tree, type TreeProps } from '@dxos/react-ui-list';
import { type MaybePromise } from '@dxos/util';

import { NavTreeItemAction } from './NavTreeItemAction';
import { NAVTREE_PLUGIN } from '../meta';
import { type NavTreeItem } from '../types';

export const NAV_TREE_ITEM = 'NavTreeItem';

export type NavTreeProps = Omit<
  TreeProps,
  'items' | 'draggable' | 'gridTemplateColumns' | 'renderColumns' | 'onOpenChange' | 'onSelect'
> & {
  items: NavTreeItem[];
  loadDescendents?: NavTreeColumnsProps['loadDescendents'];
  renderPresence?: NavTreeColumnsProps['renderPresence'];
  popoverAnchorId?: NavTreeColumnsProps['popoverAnchorId'];
  onOpenChange?: (item: NavTreeItem, open: boolean) => void;
  onSelect?: (item: NavTreeItem, state: boolean) => void;
};

export const NavTree = ({
  loadDescendents,
  renderPresence,
  popoverAnchorId,
  onOpenChange,
  onSelect,
  ...props
}: NavTreeProps) => {
  const renderColumns = useCallback(
    ({ item, menuOpen, setMenuOpen }: { item: ItemType; menuOpen: boolean; setMenuOpen: (open: boolean) => void }) => {
      return (
        <NavTreeColumns
          item={item as NavTreeItem}
          menuOpen={menuOpen}
          setMenuOpen={setMenuOpen}
          loadDescendents={loadDescendents}
          renderPresence={renderPresence}
          popoverAnchorId={popoverAnchorId}
        />
      );
    },
    [renderPresence],
  );

  return (
    <Tree
      {...props}
      draggable
      gridTemplateColumns='[tree-row-start] 1fr min-content min-content min-content [tree-row-end]'
      renderColumns={renderColumns}
      onOpenChange={onOpenChange as TreeProps['onOpenChange']}
      onSelect={onSelect as TreeProps['onSelect']}
    />
  );
};

type NavTreeColumnsProps = {
  item: NavTreeItem;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  loadDescendents?: (node: Node) => MaybePromise<void>;
  renderPresence?: FC<{ item: NavTreeItem }>;
  popoverAnchorId?: string;
};

const NavTreeColumns = ({
  item,
  menuOpen,
  setMenuOpen,
  loadDescendents,
  renderPresence: Presence,
  popoverAnchorId,
}: NavTreeColumnsProps) => {
  const { t } = useTranslation(NAVTREE_PLUGIN);

  const level = item.path.length - 1;

  const [primaryAction, ...secondaryActions] = item.actions.toSorted((a, b) =>
    a.properties?.disposition === 'toolbar' ? -1 : 1,
  );

  const actions = (primaryAction?.properties?.disposition === 'toolbar' ? secondaryActions : item.actions)
    .flatMap((action) => (isAction(action) ? [action] : []))
    .filter((action) => !action.properties?.hidden);

  const ActionRoot = popoverAnchorId === `dxos.org/ui/${NAV_TREE_ITEM}/${item.id}` ? Popover.Anchor : Fragment;

  // TODO(thure): Ideally this should not be necessary.
  useEffect(() => {
    const frame = requestAnimationFrame(() => {
      void loadDescendents?.(item.node);
      if (primaryAction && !isAction(primaryAction)) {
        void loadDescendents?.(primaryAction);
      }
    });
    return () => cancelAnimationFrame(frame);
  }, [primaryAction]);

  return (
    <ActionRoot>
      {primaryAction?.properties?.disposition === 'toolbar' ? (
        <NavTreeItemAction
          testId={primaryAction.properties?.testId}
          label={toLocalizedString(primaryAction.properties?.label, t)}
          icon={primaryAction.properties?.icon ?? 'ph--placeholder--regular'}
          parent={item.node}
          monolithic={isAction(primaryAction)}
          menuActions={isAction(primaryAction) ? [primaryAction] : item.groupedActions[primaryAction.id]}
          menuType={primaryAction.properties?.menuType}
          caller={NAV_TREE_ITEM}
        />
      ) : (
        <Treegrid.Cell />
      )}
      {actions.length > 0 ? (
        <NavTreeItemAction
          testId={`navtree.treeItem.actionsLevel${level}`}
          label={t('tree item actions label')}
          icon='ph--dots-three-vertical--regular'
          parent={item.node}
          menuActions={actions}
          menuType='dropdown'
          caller={NAV_TREE_ITEM}
          menuOpen={menuOpen}
          onChangeMenuOpen={setMenuOpen}
        />
      ) : (
        <Treegrid.Cell />
      )}
      {Presence && <Presence item={item} />}
    </ActionRoot>
  );
};
